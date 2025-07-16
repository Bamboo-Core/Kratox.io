import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/components/ui/use-toast";
import {
  TenantCreateSchema,
  useCreateTenant,
  TenantCreateFormValues,
} from "@/hooks/useAdminManagement";

export const useTenantForm = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const createTenantMutation = useCreateTenant();

  const form = useForm<TenantCreateFormValues>({
    resolver: zodResolver(TenantCreateSchema),
    defaultValues: {
      name: "",
      company: "",
      email: "",
    },
  });

  const onSubmit = async (values: TenantCreateFormValues) => {
    try {
      await createTenantMutation.mutateAsync(values);
      toast({
        title: "Tenant created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    } catch (error: any) {
      toast({
        title: "Failed to create tenant",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  return {
    form,
    isDialogOpen,
    setIsDialogOpen,
    onSubmit,
  };
};