"use client"

import React, { useEffect, useState } from "react"
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
import { X, Edit3 } from "lucide-react"
import { useIdeaStore } from "@/store/idea_store"
import { Spinner } from "@/components/ui/spinner"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Status, parseStatus } from "@/requests/idea_reqs"
import {IdeaDTO} from "../../../requests/idea_reqs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

const formSchema = z.object({
    ideaName: z.string().min(3, {
        message: "O título deve ter pelo menos 3 caracteres",
    }),
    tagInput: z.string().optional(),
    status: z.string().optional(),
})

const EditIdea = ({
    idea,
    triggerLabel = "Editar",
}: {
    idea: { id?: string; title: string; tags?: string[]; status?: import("@/requests/idea_reqs").Status },
    triggerLabel?: string,
}) => {
    const [open, setOpen] = useState<boolean>(false)
    const [tags, setTags] = useState<string[]>(idea.tags ?? [])
    const [loading, setLoading] = useState<boolean>(false)
    const mapEnumToCode = (s?: import("@/requests/idea_reqs").Status) => {
        if (s === Status.ACTIVE) return "ACTIVE"
        if (s === Status.FINISHED) return "FINISHED"
        return "DRAFT"
    }

    // normalize any incoming status value (number, english code, or localized label) into API string code
    const normalizeStatusToCode = (raw: any) => {
        // try parseStatus to get the localized enum (Status)
        try {
            const parsed = parseStatus(raw)
            return mapEnumToCode(parsed)
        } catch (e) {
            return mapEnumToCode(undefined)
        }
    }

    const [status, setStatus] = useState<string>(normalizeStatusToCode(idea.status))

    const updateIdea = useIdeaStore.getState().updateIdea
    const deleteIdea = useIdeaStore.getState().deleteIdea

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            ideaName: idea.title ?? "",
            tagInput: "",
            status: String(idea.status ?? ""),
        },
    })

    // when opening, ensure form shows latest idea values
    useEffect(() => {
        form.setValue("ideaName", idea.title ?? "")
        const code = normalizeStatusToCode(idea.status)
        form.setValue("status", code)
        setTags(idea.tags ?? [])
        setStatus(code)
    }, [open, idea])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        try {
            const payload: Partial<IdeaDTO> = {
                id: idea.id,
                title: values.ideaName,
                tags: Array.isArray(tags) ? tags : [],
                // send status as string code (e.g. 'DRAFT','ACTIVE','FINISHED') to match API expectations
                status: status,
            }
            console.log('update payload:', payload)
            const success = await updateIdea(payload)
            if (success) {
                form.reset()
                setOpen(false)
            } else {
                console.warn('updateIdea returned false')
            }
        } catch (err) {
            console.error('updateIdea failed', err)
        } finally {
            setLoading(false)
        }
    }

    const handleAddTags = () => {
        const newTag = (form.getValues("tagInput") || "").trim()
        if (!newTag) return
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
                <Button variant="ghost"><Edit3 className="mr-2" />{triggerLabel}</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader className="mb-4">
                    <DialogTitle>
                        Editar ideia
                    </DialogTitle>
                    <DialogDescription>
                        Altere os campos da sua ideia e salve as mudanças.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                                        Será o título da sua ideia.
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
                                        Insira tags para sua ideia. Será útil para organizar e filtrar ideias.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
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

                        {/* status select (shadcn) */}
                        <FormField
                            control={form.control}
                            name="status"
                            render={() => (
                                <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <FormControl>
                                        <Select onValueChange={(v) => setStatus(v)} defaultValue={status}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Status da Ideia" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={"DRAFT"}>{Status.DRAFT}</SelectItem>
                                                <SelectItem value={"ACTIVE"}>{Status.ACTIVE}</SelectItem>
                                                <SelectItem value={"FINISHED"}>{Status.FINISHED}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                    <FormDescription>Altere o status da ideia.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className={"w-full flex items-center justify-between gap-4"}>
                            <div>
                                <Button
                                    type="button"
                                    variant={"destructive"}
                                    onClick={async () => {
                                        if (loading) return
                                        const confirmDelete = window.confirm("Tem certeza que deseja excluir esta ideia? Esta ação não pode ser desfeita.")
                                        if (!confirmDelete) return
                                        setLoading(true)
                                        try {
                                            const success = await deleteIdea(idea.id)
                                            if (success) {
                                                // store shows toast; close modal
                                                setOpen(false)
                                            }
                                        } catch (err) {
                                            console.error('delete failed', err)
                                        } finally {
                                            setLoading(false)
                                        }
                                    }}
                                    disabled={loading}
                                >
                                    Excluir
                                </Button>
                            </div>
                            <div className="flex gap-4">
                                <Button type="button" variant={"ghost"} onClick={() => {form.reset(); setOpen(false)}} disabled={loading}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={loading} aria-busy={loading}>
                                    {loading ? (
                                        <>
                                            <Spinner className="inline-block mr-2" />
                                            Salvando
                                        </>
                                    ) : (
                                        "Salvar"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export default EditIdea
