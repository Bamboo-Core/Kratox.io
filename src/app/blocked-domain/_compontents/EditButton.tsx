"use client";

import Link from "next/link";
import { useTranslation } from 'react-i18next';

export function EditButton() {
    const { t } = useTranslation();

    return (
        <Link
            href="/edit-page"
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md inline-block"
            target="_blank"
        >
            {t("accessForbidden.edit")}
        </Link>
    );
}
