const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001').replace(
    /\/$/,
    ''
);

interface SendCodeResponse {
    message: string;
}

interface VerifyCodeResponse {
    valid: boolean;
    message: string;
}

interface ResetPasswordResponse {
    message: string;
}

interface ApiError {
    error: string;
}

export async function sendRecoveryCode(email: string): Promise<SendCodeResponse> {
    const response = await fetch(`${API_BASE_URL}/api/password-recovery/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error((data as ApiError).error || 'Erro ao enviar código');
    }

    return data as SendCodeResponse;
}

export async function verifyRecoveryCode(email: string, code: string): Promise<VerifyCodeResponse> {
    const response = await fetch(`${API_BASE_URL}/api/password-recovery/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error((data as ApiError).error || 'Código inválido');
    }

    return data as VerifyCodeResponse;
}

export async function resetPassword(
    email: string,
    code: string,
    password: string,
    password_confirmation: string
): Promise<ResetPasswordResponse> {
    const response = await fetch(`${API_BASE_URL}/api/password-recovery/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password, password_confirmation }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error((data as ApiError).error || 'Erro ao redefinir senha');
    }

    return data as ResetPasswordResponse;
}
