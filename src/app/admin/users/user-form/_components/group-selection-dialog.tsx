
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
import { PlusCircle, Trash2, Search } from 'lucide-react';
import type { ZabbixHostGroup } from '@/hooks/useZabbix';

interface GroupSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  allGroups: ZabbixHostGroup[];
  selectedGroupIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
}

export function GroupSelectionDialog({
  isOpen,
  onClose,
  allGroups,
  selectedGroupIds,
  onSelectionChange,
}: GroupSelectionDialogProps) {
  const [filter, setFilter] = useState('');

  const filteredGroups = useMemo(() => {
    if (!filter) return allGroups;
    return allGroups.filter((group) => group.name.toLowerCase().includes(filter.toLowerCase()));
  }, [allGroups, filter]);

  const handleToggleGroup = (groupId: string) => {
    const newSelection = selectedGroupIds.includes(groupId)
      ? selectedGroupIds.filter((id) => id !== groupId)
      : [...selectedGroupIds, groupId];
    onSelectionChange(newSelection);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Selecionar Grupos de Hosts</DialogTitle>
          <DialogDescription>
            Associe um ou mais grupos de hosts do Zabbix a este usuário.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Filtrar por nome..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10"
            />
          </div>
          <ScrollArea className="h-72 w-full rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-secondary">
                <TableRow>
                  <TableHead>Nome do Grupo</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.length > 0 ? (
                  filteredGroups.map((group) => {
                    const isSelected = selectedGroupIds.includes(group.groupid);
                    return (
                      <TableRow key={group.groupid}>
                        <TableCell className="font-medium">{group.name}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant={isSelected ? 'destructive' : 'outline'}
                            size="sm"
                            className={
                              !isSelected
                                ? 'hover:bg-orange-500 hover:text-white hover:border-orange-500'
                                : ''
                            }
                            onClick={() => handleToggleGroup(group.groupid)}
                          >
                            {isSelected ? (
                              <Trash2 className="mr-2 h-4 w-4" />
                            ) : (
                              <PlusCircle className="mr-2 h-4 w-4" />
                            )}
                            {isSelected ? 'Remover' : 'Adicionar'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                      Nenhum grupo encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button onClick={onClose} className='bg-orange-500 text-white hover:bg-orange-600 hover:text-white hover:border-orange-500'>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
