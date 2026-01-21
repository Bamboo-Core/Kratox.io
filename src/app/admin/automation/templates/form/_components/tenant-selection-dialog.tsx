'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import type { Tenant } from '@/hooks/useAdminManagement';

interface TenantSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  allTenants: Tenant[];
  selectedTenantIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
}

export function TenantSelectionDialog({
  isOpen,
  onClose,
  allTenants,
  selectedTenantIds,
  onSelectionChange,
}: TenantSelectionDialogProps) {
  const [filter, setFilter] = useState('');

  const filteredTenants = useMemo(() => {
    // Exclude the 'NOC AI Corp' tenant from being selectable
    const selectableTenants = allTenants.filter((t) => t.name !== 'NOC AI Corp');
    if (!filter) return selectableTenants;
    return selectableTenants.filter((tenant) =>
      tenant.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [allTenants, filter]);

  const handleToggleTenant = (tenantId: string) => {
    const newSelection = selectedTenantIds.includes(tenantId)
      ? selectedTenantIds.filter((id) => id !== tenantId)
      : [...selectedTenantIds, tenantId];
    onSelectionChange(newSelection);
  };

  const handleToggleAll = () => {
    if (selectedTenantIds.length === filteredTenants.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredTenants.map((t) => t.id));
    }
  };

  const isAllSelected =
    filteredTenants.length > 0 && selectedTenantIds.length === filteredTenants.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Select Tenants</DialogTitle>
          <DialogDescription>
            Choose which tenants will have this template enabled automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Filter by tenant name..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10"
            />
          </div>
          <ScrollArea className="h-72 w-full rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-secondary">
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleToggleAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Tenant Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.length > 0 ? (
                  filteredTenants.map((tenant) => {
                    const isSelected = selectedTenantIds.includes(tenant.id);
                    return (
                      <TableRow
                        key={tenant.id}
                        data-state={isSelected && 'selected'}
                        onClick={() => handleToggleTenant(tenant.id)}
                        className="cursor-pointer"
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleTenant(tenant.id)}
                            aria-label={`Select ${tenant.name}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{tenant.name}</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                      No tenants found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
          <div className="text-sm text-muted-foreground">
            {selectedTenantIds.length} of {filteredTenants.length} tenants selected.
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
