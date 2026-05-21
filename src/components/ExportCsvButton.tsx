import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onClick: () => void;
  disabled?: boolean;
}

export const ExportCsvButton = ({ onClick, disabled }: Props) => (
  <Button
    variant="outline"
    size="sm"
    className="gap-2 border-border bg-card hover:bg-accent h-10"
    onClick={onClick}
    disabled={disabled}
  >
    <Download className="h-4 w-4" />
    <span className="hidden sm:inline">Exportar CSV</span>
  </Button>
);
