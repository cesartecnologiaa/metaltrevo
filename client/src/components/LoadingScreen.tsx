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
      <div className="relative flex min-h-[60vh] items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_35%),radial-gradient(circle_at_bottom,_rgba(6,182,212,0.14),_transparent_30%)]" />
        <div className="relative">
          <div className="backdrop-blur-2xl bg-white/10 border border-white/20 shadow-2xl rounded-2xl px-8 py-7 text-center min-w-[240px]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 border border-white/10">
              <Spinner className="size-7" />
            </div>
            <p className="text-white font-medium">{message}</p>
            <p className="text-white/50 text-sm mt-1">Aguarde um instante</p>
          </div>
        </div>
      </div>
    </div>
  );
}