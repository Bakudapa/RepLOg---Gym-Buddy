import { LogOut } from "lucide-react";
import { logout } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logout} className={className}>
      <Button type="submit" variant="secondary" className="w-full text-sm">
        <LogOut aria-hidden size={16} />
        Log out
      </Button>
    </form>
  );
}
