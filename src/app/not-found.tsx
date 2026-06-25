import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl font-bold gradient-text">404</p>
      <p className="text-muted-foreground">Esta página no existe.</p>
      <Button asChild>
        <Link href="/dashboard">Ir al inicio</Link>
      </Button>
    </div>
  );
}
