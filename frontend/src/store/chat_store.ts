import { create } from "zustand";
import {createJSONStorage, persist } from "zustand/middleware";
import {createChatReq, deleteChatReq, getAllChatsReq, sendMessageReq} from "../requests/chat_reqs";

interface ChatMessage {
    message_id: string,
    message: string,
    sender: "AI" | "USER",
    created_at?: string,
}

export interface Chat {
    idea_id: string,
    chat_id: string,
    messages: ChatMessage[],
}

interface ChatStore {
    chats: Chat[]
    ideaChats: (idea_id: string) => Chat[],
    chat: (chat_id: string) => Chat,
}

interface ChatStoreActions {
    mapChats: () => Promise<void | false>,
    sendMessage: (chat_id: string, message: string) => Promise<void | false>,
    createChat: (idea_id: string) => Promise<string | false>,
    deleteChat: (chat_id: string) => Promise<void | false>,
    addOptimisticMessage: (chat_id: string, message: string) => void,
}

// Helper function to sort messages by created_at
const sortMessagesByDate = (messages: ChatMessage[]): ChatMessage[] => {
    return [...messages].sort((a, b) => {
        if (!a.created_at || !b.created_at) return 0
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
}

export const useChatStore = create<ChatStore & ChatStoreActions>()(
    persist(
        (set, get) => ({
            chats: [],

            chat: (idea_id: string) => {
                return get().chats.find(c => c.idea_id === idea_id) ?? {idea_id, chat_id: "", messages: []}
            },

            ideaChats: (idea_id: string) => {
                return get().chats.filter(c => c.idea_id === idea_id)
            },

            mapChats: async () => {
                const res = await getAllChatsReq()
                if(!res) return false

                // Sort messages by created_at for each chat
                if (!Array.isArray(res)) return false
                const sortedChats = res.map(chat => ({
                    ...chat,
                    messages: sortMessagesByDate(chat.messages)
                }))

                set({chats: sortedChats})
            },

            createChat: async(idea_id: string): Promise<string | false> => {
                const res = await createChatReq(idea_id)
                if(!res) return false
                await get().mapChats()

                // Automatically create a chat for the newly created idea and seed it with an initial message.
                try {
                    if (idea_id) {
                        const seededKey = `seeded_initial_chat_${idea_id}`
                        let alreadySeeded = null
                        try { alreadySeeded = typeof window !== 'undefined' ? window.localStorage.getItem(seededKey) : null } catch (e) { alreadySeeded = null }
                        if (!alreadySeeded) {
                            try {
                                if (res.chat_id) {

                                    const chatId = res.chat_id
                                    const sent = await sendMessageReq({ chat_id: chatId, message: "" })
                                    if (sent) {
                                        try { typeof window !== 'undefined' && window.localStorage.setItem(seededKey, '1') } catch (e) {}
                                    }
                                }
                            } catch (e) {
                                console.warn('createChat/sendMessage after createIdea failed', e)
                            }
                        }
                    }
                } catch (e) {
                    console.warn('auto seed chat after createIdea error', e)
                }
                return res.chat_id
            },

            addOptimisticMessage: (chat_id: string, message: string) => {
                const currentChats = get().chats
                const updatedChats = currentChats.map(chat => {
                    if (chat.chat_id === chat_id) {
                        const newMessage = {
                            message_id: `temp-${Date.now()}`,
                            message: message,
                            sender: "USER" as const,
                            created_at: new Date().toISOString()
                        }
                        return {
                            ...chat,
                            messages: sortMessagesByDate([...chat.messages, newMessage])
                        }
                    }
                    return chat
                })
                set({ chats: updatedChats })
            },

            sendMessage: async(chat_id: string, message: string) => {
                const res = await sendMessageReq({chat_id, message})
                if(!res) return false
                await get().mapChats()
            },
            deleteChat: async (chat_id: string) => {
                const res = await deleteChatReq(chat_id)
                if(!res) return false
                await get().mapChats()
            }
        }),
     {
        name: "chat-storage",
        storage: createJSONStorage(() =>
            typeof window !== "undefined" && typeof window.localStorage !== "undefined"
                ? window.localStorage
                : {
                    getItem: (_key: string) => null,
                    setItem: (_key: string, _value: string) => {},
                    removeItem: (_key: string) => {},
                }
        ),
     }
    )
)