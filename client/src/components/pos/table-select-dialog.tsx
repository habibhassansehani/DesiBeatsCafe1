import { Grid3X3, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Table } from "@shared/schema";

interface TableSelectDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (table: Table | null) => void;
  tables: Table[];
  selectedTableId?: string;
}

export function TableSelectDialog({
  open,
  onClose,
  onSelect,
  tables,
  selectedTableId,
}: TableSelectDialogProps) {
  const getStatusColor = (status: Table["status"]) => {
    switch (status) {
      case "available":
        return "bg-status-online/10 border-status-online text-status-online";
      case "occupied":
        return "bg-status-away/10 border-status-away text-status-away";
      case "billed":
        return "bg-status-busy/10 border-status-busy text-status-busy";
      default:
        return "bg-muted border-muted-foreground text-muted-foreground";
    }
  };

  const getStatusLabel = (status: Table["status"]) => {
    switch (status) {
      case "available":
        return "Available";
      case "occupied":
        return "Occupied";
      case "billed":
        return "Billed";
      default:
        return status;
    }
  };

  const availableTables = tables.filter((t) => t.status === "available");
  const occupiedTables = tables.filter((t) => t.status !== "available");

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5" />
            Select Table
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Takeaway Option */}
          <div>
            <Button
              variant={!selectedTableId ? "default" : "outline"}
              className="w-full h-16"
              onClick={() => {
                onSelect(null);
                onClose();
              }}
              data-testid="button-takeaway"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Takeaway</p>
                  <p className="text-xs text-muted-foreground">No table assigned</p>
                </div>
              </div>
            </Button>
          </div>

          {/* Available Tables */}
          {availableTables.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Available Tables ({availableTables.length})
              </h3>
              <ScrollArea className="h-[200px]">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {availableTables.map((table) => (
                    <Button
                      key={table._id}
                      variant={selectedTableId === table._id ? "default" : "outline"}
                      className="h-20 flex flex-col items-center justify-center gap-1 relative"
                      onClick={() => {
                        onSelect(table);
                        onClose();
                      }}
                      data-testid={`button-table-${table._id}`}
                    >
                      <span className="text-lg font-bold">T{table.number}</span>
                      <span className="text-xs text-muted-foreground">{table.name}</span>
                      <Badge
                        variant="outline"
                        className={`absolute -top-1 -right-1 text-[10px] px-1 ${getStatusColor(table.status)}`}
                      >
                        {table.capacity}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Occupied Tables */}
          {occupiedTables.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Occupied Tables ({occupiedTables.length})
              </h3>
              <ScrollArea className="h-[150px]">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {occupiedTables.map((table) => (
                    <Button
                      key={table._id}
                      variant="outline"
                      className="h-20 flex flex-col items-center justify-center gap-1 relative opacity-60"
                      disabled
                      data-testid={`button-table-${table._id}`}
                    >
                      <span className="text-lg font-bold">T{table.number}</span>
                      <span className="text-xs">{table.name}</span>
                      <Badge
                        variant="outline"
                        className={`absolute -top-1 -right-1 text-[10px] px-1 ${getStatusColor(table.status)}`}
                      >
                        {getStatusLabel(table.status)}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {tables.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Grid3X3 className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No tables configured</p>
              <p className="text-sm">Add tables in the admin panel</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
