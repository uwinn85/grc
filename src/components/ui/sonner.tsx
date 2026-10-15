import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheck, Info, AlertTriangle, AlertOctagon, Loader2 } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      richColors
      position="top-right"
      icons={{
        success: <CircleCheck className="size-4" />,
        info: <Info className="size-4" />,
        warning: <AlertTriangle className="size-4" />,
        error: <AlertOctagon className="size-4" />,
        loading: <Loader2 className="size-4 animate-spin" />,
      }}
      {...props}
    />
  )
}

export { Toaster }
