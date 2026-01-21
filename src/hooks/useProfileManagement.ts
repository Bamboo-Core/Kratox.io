'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import * as z from 'zod';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001').replace(
  /\/$/,
  ''
);
const PROFILE_QUERY_KEY = 'userProfile';

// --- Schema & Types ---
export const profileFormSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  password: z
    .string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres.')
    .or(z.literal(''))
    .optional(),
  phone_number: z.string().optional(),
});
export type ProfileFormData = z.infer<typeof profileFormSchema>;

// This type should match what the backend returns
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone_number?: string;
}

// --- API Function ---
const getAuthHeader = (token: string | null) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

async function updateUserProfile(
  data: ProfileFormData,
  token: string | null
): Promise<UserProfile> {
  if (!token) throw new Error('Token de autenticação ausente.');

  // Não envie um campo de senha vazio para o backend
  const payload: Partial<ProfileFormData> = { name: data.name };
  if (data.password) {
    payload.password = data.password;
  }
  if (data.phone_number) {
    payload.phone_number = data.phone_number;
  }

  const response = await fetch(`${API_BASE_URL}/api/profile`, {
    method: 'PUT',
    headers: getAuthHeader(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error((await response.json()).error || 'Falha ao atualizar o perfil');
  return response.json();
}

// --- Custom Hook ---
export const useProfileMutation = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation<UserProfile, Error, ProfileFormData>({
    mutationFn: (data: ProfileFormData) => updateUserProfile(data, token),
    onSuccess: (data) => {
      // Invalidate user-related queries if needed, though authStore update is more direct
      queryClient.invalidateQueries({ queryKey: [PROFILE_QUERY_KEY, data.id] });
    },
  });
};
