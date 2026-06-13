import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-center"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-2xl group-[.toaster]:border-white/70 group-[.toaster]:bg-white group-[.toaster]:text-ink group-[.toaster]:shadow-soft-lg",
          title: "group-[.toast]:font-display group-[.toast]:font-extrabold",
          description: "group-[.toast]:text-ink/60",
          actionButton:
            "group-[.toast]:rounded-full group-[.toast]:bg-gradient-sun group-[.toast]:font-bold group-[.toast]:text-ink",
          cancelButton:
            "group-[.toast]:rounded-full group-[.toast]:bg-sand-soft group-[.toast]:text-ink",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
