// src/types/rules.ts

export interface Rule {
  id: string;
  name: string;
  triggerType: string;
  triggerCondition: string;
  actionCommand: string;
  isEnabled: boolean;
  tenant: string;
}
