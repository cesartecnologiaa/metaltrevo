import { Spinner } from "@/components/ui/spinner";

type LoadingScreenProps = {
  message?: string;
  fullScreen?: boolean;
};

export default function LoadingScreen({
  message = "Carregando...",
  fullScreen = true,
}: LoadingScreenProps) {
  return (
    <div className={fullScreen ? "min-h-screen w-full bg-slate-950" : "w-full py-16"}>
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <Spinner className="size-7 text-cyan-300" />
        <p className="mt-4 text-base font-medium text-white">{message}</p>
        <p className="mt-1 text-sm text-white/50">Aguarde um instante</p>
      </div>
    </div>
  );
}