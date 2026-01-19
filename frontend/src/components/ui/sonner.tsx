"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      expand={true}
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        classNames: {
          toast: "group toast shadow-lg border-2",
          title: "font-semibold text-sm",
          description: "text-sm opacity-90",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
          closeButton: "bg-background border-border hover:bg-muted",
          success: "border-green-500/20 bg-green-50 dark:bg-green-950/20 text-green-900 dark:text-green-100",
          error: "border-red-500/20 bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-100",
          warning: "border-yellow-500/20 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-900 dark:text-yellow-100",
          info: "border-blue-500/20 bg-blue-50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-100",
          loading: "border-primary/20 bg-primary/5",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-5 text-green-600 dark:text-green-400" />,
        info: <InfoIcon className="size-5 text-blue-600 dark:text-blue-400" />,
        warning: <TriangleAlertIcon className="size-5 text-yellow-600 dark:text-yellow-400" />,
        error: <OctagonXIcon className="size-5 text-red-600 dark:text-red-400" />,
        loading: <Loader2Icon className="size-5 animate-spin text-primary" />,
      }}
      {...props}
    />
  )
}

export { Toaster }
