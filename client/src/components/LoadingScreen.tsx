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
      <div className="relative flex min-h-[60vh] items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col items-center justify-center px-8 py-8 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <Spinner className="size-7 text-cyan-300" />
            </div>

            <p className="text-base font-medium text-white">{message}</p>
            <p className="mt-1 text-sm text-white/50">Aguarde um instante</p>
          </div>
        </div>
      </div>
    </div>
  );
}