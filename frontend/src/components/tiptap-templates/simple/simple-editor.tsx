"use client";
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "@/components/tiptap-node/code-block-node/code-block-node.scss";
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import "@/components/tiptap-node/list-node/list-node.scss";
import "@/components/tiptap-node/image-node/image-node.scss";
import "@/components/tiptap-node/heading-node/heading-node.scss";
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss";
// --- Styles ---
import "@/components/tiptap-templates/simple/simple-editor.scss";

import BubbleMenu from "@tiptap/extension-bubble-menu";
import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Selection } from "@tiptap/extensions";
import {
    Editor,
    EditorContent,
    EditorContext,
    JSONContent,
    useEditor,
} from "@tiptap/react";
// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit";
import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// --- Icons ---
import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon";
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon";
import { LinkIcon } from "@/components/tiptap-icons/link-icon";
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension";
// --- Components ---
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button";
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button";
import {
    ColorHighlightPopover,
    ColorHighlightPopoverButton,
    ColorHighlightPopoverContent,
} from "@/components/tiptap-ui/color-highlight-popover";
// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu";
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button";
import {
    LinkButton,
    LinkContent,
    LinkPopover,
} from "@/components/tiptap-ui/link-popover";
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu";
import { MarkButton } from "@/components/tiptap-ui/mark-button";
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button";
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button";
// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button";
import {
    Toolbar,
    ToolbarGroup,
    ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar";
import { useCursorVisibility } from "@/hooks/use-cursor-visibility";
// --- Hooks ---
import { useIsMobile } from "@/hooks/use-mobile";
import { useWindowSize } from "@/hooks/use-window-size";
import { debounce } from "@/lib/debounce";
// --- Lib ---
import { handleImageUpload } from "@/lib/tiptap-utils";
import { useIdeaStore } from "@/store/idea_store";


const MainToolbarContent = ({
                                onHighlighterClick,
                                onLinkClick,
                                isMobile,
                            }: {
    onHighlighterClick: () => void;
    onLinkClick: () => void;
    isMobile: boolean;
}) => {
    return (
        <>
            <ToolbarGroup>
                <UndoRedoButton action="undo" />
                <UndoRedoButton action="redo" />
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
                <HeadingDropdownMenu levels={[1, 2, 3, 4]} portal={isMobile} />
                <ListDropdownMenu
                    types={["bulletList", "orderedList", "taskList"]}
                    portal={isMobile}
                />
                <BlockquoteButton />
                <CodeBlockButton />
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
                <MarkButton type="bold" />
                <MarkButton type="italic" />
                <MarkButton type="strike" />
                <MarkButton type="code" />
                <MarkButton type="underline" />
                {!isMobile ? (
                    <ColorHighlightPopover />
                ) : (
                    <ColorHighlightPopoverButton onClick={onHighlighterClick} />
                )}
                {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
                <MarkButton type="superscript" />
                <MarkButton type="subscript" />
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
                <TextAlignButton align="left" />
                <TextAlignButton align="center" />
                <TextAlignButton align="right" />
                <TextAlignButton align="justify" />
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
                <ImageUploadButton text="Add" />
            </ToolbarGroup>
        </>
    );
};

const MobileToolbarContent = ({
                                  type,
                                  onBack,
                              }: {
    type: "highlighter" | "link";
    onBack: () => void;
}) => (
    <>
        <ToolbarGroup>
            <Button data-style="ghost" onClick={onBack}>
                <ArrowLeftIcon className="tiptap-button-icon" />
                {type === "highlighter" ? (
                    <HighlighterIcon className="tiptap-button-icon" />
                ) : (
                    <LinkIcon className="tiptap-button-icon" />
                )}
            </Button>
        </ToolbarGroup>

        <ToolbarSeparator />

        {type === "highlighter" ? (
            <ColorHighlightPopoverContent />
        ) : (
            <LinkContent />
        )}
    </>
);

interface Props {
    idea_id: string;
    annotation?: string | JSONContent;
}

export function SimpleEditor({idea_id, annotation}: Props) {
    const isMobile = useIsMobile();
    const windowSize = useWindowSize();
    const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">("main");
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const updateIdea = useIdeaStore((state) => state.updateIdea);

    // Ref to track if we're currently saving to prevent update loops
    const isSavingRef = useRef(false);

    // Debounced save function
    const debouncedSave = useRef(
        debounce(async (id: string, content: JSONContent) => {
            if (isSavingRef.current) return;

            isSavingRef.current = true;
            try {
                console.log('[autosave] saving annotation', { id, content });
                await updateIdea({ id, raw_content: content });
                toast.success('Salvo automaticamente ✓', {
                    description: 'Suas anotações foram salvas',
                    duration: 2000
                });
            } catch (err) {
                console.error('Erro ao salvar anotação:', err);
                toast.error('Erro ao salvar', {
                    description: 'Não foi possível salvar suas alterações',
                    duration: 3000
                });
            } finally {
                isSavingRef.current = false;
            }
        }, 2000)
    ).current;

    // Compute CSS offset for header height
    useEffect(() => {
        const computeOffset = () => {
            const header = document.querySelector('header') as HTMLElement | null;
            const headerHeight = header?.getBoundingClientRect().height ?? 0;
            const offset = headerHeight + 8; // 8px margin

            if (wrapperRef.current) {
                wrapperRef.current.style.setProperty('--simple-editor-viewport-offset', `${offset}px`);
            }
        };

        computeOffset();
        window.addEventListener('resize', computeOffset);
        return () => window.removeEventListener('resize', computeOffset);
    }, []);

    const handleUpdate = useCallback(({ editor }: { editor: Editor }) => {
        if (!idea_id) return;
        const json: JSONContent = editor.getJSON();
        debouncedSave(idea_id, json);
    }, [idea_id, debouncedSave]);

    const toolbarRef = useRef<HTMLDivElement>(null);

    const editor = useEditor({
        content: annotation || "",
        onUpdate: handleUpdate,
        immediatelyRender: false,
        shouldRerenderOnTransaction: false,
        editorProps: {
            attributes: {
                autocomplete: "off",
                autocorrect: "true",
                autocapitalize: "off",
                "aria-label": "Main content area, start typing to enter text.",
                class: "simple-editor",
            },
        },
        extensions: [
            StarterKit.configure({
                horizontalRule: false,
                link: {
                    openOnClick: false,
                    enableClickSelection: true,
                },
            }),
            Placeholder.configure({
                placeholder: 'Comece a escrever sua ideia aqui...',
                emptyEditorClass: 'is-editor-empty',
            }),
            HorizontalRule,
            BubbleMenu,
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            TaskList,
            TaskItem.configure({ nested: true }),
            Highlight.configure({ multicolor: true }),
            Image.configure({
                inline: false,
                allowBase64: true,
            }),
            Typography,
            Superscript,
            Subscript,
            Selection,
            ImageUploadNode.configure({
                accept: "image/*",
                upload: handleImageUpload,
                onError: (error) => console.error("Upload failed:", error),
            }),
        ],
    });

    useEffect(() => {
        if (!editor) return;
        if (!annotation) return;

        // Only update if we're not currently saving to avoid update loops
        if (isSavingRef.current) return;

        // Check if content actually changed to avoid unnecessary updates
        const currentContent = editor.getJSON();
        const currentContentStr = JSON.stringify(currentContent);

        let newContentStr: string;
        try {
            if (typeof annotation === 'object') {
                newContentStr = JSON.stringify(annotation);
            } else if (typeof annotation === 'string') {
                const trimmed = annotation.trim();
                if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                    try {
                        const parsed = JSON.parse(trimmed);
                        newContentStr = JSON.stringify(parsed);
                    } catch {
                        newContentStr = trimmed;
                    }
                } else {
                    newContentStr = trimmed;
                }
            } else {
                return;
            }

            // Only update if content actually changed
            if (currentContentStr === newContentStr) return;

            // Update content
            if (typeof annotation === 'object') {
                editor.commands.setContent(annotation, { emitUpdate: false });
            } else if (typeof annotation === 'string') {
                const trimmed = annotation.trim();
                if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                    try {
                        const parsed = JSON.parse(trimmed);
                        editor.commands.setContent(parsed, { emitUpdate: false });
                    } catch {
                        editor.commands.setContent(annotation, { emitUpdate: false });
                    }
                } else {
                    editor.commands.setContent(annotation, { emitUpdate: false });
                }
            }
        } catch (err) {
            console.warn('Failed to apply annotation to editor:', err);
        }
    }, [annotation, editor]);

    const bodyRect = useCursorVisibility({
        editor,
        overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
    });

    useEffect(() => {
        if (!isMobile && mobileView !== "main") {
            setMobileView("main");
        }
    }, [isMobile, mobileView]);

    console.log('[SimpleEditor] Render state', {
        hasEditor: !!editor,
        hasAnnotation: !!annotation,
        annotationType: typeof annotation,
        idea_id
    });

    if (!editor) {
        console.log('[SimpleEditor] Editor not initialized yet');
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-sm text-muted-foreground">Carregando editor...</div>
            </div>
        );
    }


    return (
        <div ref={wrapperRef} className="simple-editor-wrapper inline">
            <EditorContext.Provider value={{ editor }}>
                <Toolbar
                    ref={toolbarRef}
                    style={isMobile ? { bottom: `calc(100% - ${windowSize.height - bodyRect.y}px)` } : {}}
                >
                    {mobileView === "main" ? (
                        <MainToolbarContent
                            onHighlighterClick={() => setMobileView("highlighter")}
                            onLinkClick={() => setMobileView("link")}
                            isMobile={isMobile}
                        />
                    ) : (
                        <MobileToolbarContent
                            type={mobileView === "highlighter" ? "highlighter" : "link"}
                            onBack={() => setMobileView("main")}
                        />
                    )}
                </Toolbar>

                <EditorContent editor={editor} role="presentation" className="simple-editor-content" />
            </EditorContext.Provider>
        </div>
    );
}
