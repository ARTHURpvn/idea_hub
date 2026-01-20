"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import z from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { PlusIcon, X, Save } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useIdeaStore } from "@/store/idea_store"
import { Spinner } from "@/components/ui/spinner"

const formSchema = z.object({
    ideaName: z.string().min(10, {
        message: "A ideia deve ter pelo menos 10 caracteres",
    }),
    // tagInput is transient (single tag input) and optional
    tagInput: z.string().optional(),
})

const AddIdea = ({variant}: {variant: "default" | "secondary" | "primary"}) => {
    const [open, setOpen] = useState<boolean>(false)
    const [tags, setTags] = useState<string[]>([])
    const [loading, setLoading] = useState<boolean>(false)

    const createIdea = useIdeaStore((state) => state.createIdea)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            ideaName: "",
            tagInput: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        try {
            const success = await createIdea(values.ideaName, tags)
            if (success) {
                return
            } else {
                console.warn('createIdea returned false')
                setLoading(false)
            }
        } catch (err) {
            console.error('createIdea failed', err)
            setLoading(false)
        }
    }

    const handleAddTags = () => {
        const newTag = (form.getValues("tagInput") || "").trim()
        if (!newTag) return
        // avoid duplicates
        if (tags.includes(newTag)) {
            form.setValue("tagInput", "")
            return
        }
        setTags((prev) => [...prev, newTag])
        form.setValue("tagInput", "")
    }

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault()
            handleAddTags()
        }
    }

    const removeTag = (tagToRemove: string) => {
        setTags((prev) => prev.filter((t) => t !== tagToRemove))
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { if (loading) return; setOpen(v) }}>
            <DialogTrigger asChild>
                <Button
                    variant={variant == "primary" ? "default": variant}
                    className="w-full sm:w-auto gap-2"
                >
                    <PlusIcon className="w-4 h-4" />
                    { variant == "primary" ? "Criar primeira ideia" : "Nova Ideia"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader className="mb-4">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <PlusIcon className="w-5 h-5 text-primary" />
                        Criar Nova Ideia
                    </DialogTitle>
                    <DialogDescription>
                        Adicione uma nova ideia para ser desenvolvida e organizada.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="ideaName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Título da Ideia</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Sistema de gerenciamento de tarefas" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        O título será usado pela IA para ajudar você a desenvolver a ideia
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="tagInput"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tags</FormLabel>
                                    <FormControl>
                                        <div className="flex gap-2">
                                            <Input placeholder="Ex: tecnologia, produtividade" {...field} onKeyDown={handleTagKeyDown} />
                                            <Button onClick={handleAddTags} variant={"secondary"} type="button" size="sm">
                                                Adicionar
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormDescription>
                                        Tags facilitam a organização e busca das suas ideias
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Render currently added tags with option to remove */}
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag, index) => (
                                    <Badge key={`${tag}-${index}`} className="flex items-center gap-2 px-3 py-1" variant="secondary">
                                        <span>#{tag}</span>
                                        <button
                                            type="button"
                                            aria-label={`Remover tag ${tag}`}
                                            onClick={() => removeTag(tag)}
                                            className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-destructive/20 hover:text-destructive transition"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                        <div className={"w-full justify-end flex gap-2 mt-6 pt-4 border-t"}>
                            <Button
                                type="button"
                                variant={"outline"}
                                size="sm"
                                onClick={() => {form.reset(); setTags([]); setOpen(false)}}
                                disabled={loading}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                className="gap-2"
                                disabled={loading}
                                aria-busy={loading}
                            >
                                {loading ? (
                                    <>
                                        <Spinner className="inline-block" />
                                        Criando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Criar Ideia
                                    </>
                                )}
                            </Button>
                         </div>
                     </form>
                 </Form>
             </DialogContent>
         </Dialog>
     )
 }

 export default AddIdea
