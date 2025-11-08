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
import { PlusIcon, X } from "lucide-react"
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

const AddIdea = ({variant}: {variant: "default" | "secondary"}) => {
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
                form.reset()
                setTags([])
                setOpen(false)
            } else {
                console.warn('createIdea returned false')
            }
        } catch (err) {
            console.error('createIdea failed', err)
        } finally {
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
                <Button variant={variant}><PlusIcon /> Nova Ideia</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader className="mb-4">
                    <DialogTitle>
                        Criar uma nova ideia
                    </DialogTitle>
                    <DialogDescription>
                        Adicione uma nova ideia para ser avaliada e discutida.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="ideaName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome da Ideia</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Insira a sua Ideia" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        Sera o titulo da sua ideia. A IA vai pegar essa informacao para te ajudar
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
                                            <Input placeholder="Insira uma tag" {...field} onKeyDown={handleTagKeyDown} />
                                            <Button onClick={handleAddTags} variant={"secondary"} type="button">Adicionar</Button>
                                        </div>
                                    </FormControl>
                                    <FormDescription>
                                        Insira tags para sua ideia. Sera util para organizar e filtrar ideias.
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
                                        <span>{tag}</span>
                                        <button
                                            type="button"
                                            aria-label={`Remover tag ${tag}`}
                                            onClick={() => removeTag(tag)}
                                            className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full hover:bg-muted/10"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                        <div className={"w-full justify-end flex gap-4 mt-18"}>
                            <Button type="button" variant={"ghost"} onClick={() => {form.reset(); setOpen(false)}} disabled={loading}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading} aria-busy={loading}>
                                {loading ? (
                                    <>
                                        <Spinner className="inline-block mr-2" />
                                        Carregando
                                    </>
                                ) : (
                                    "Enviar"
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
