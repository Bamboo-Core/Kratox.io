"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

export type AccordionItem = {
    id: number;
    title: string;
    content: string;
};

type AccordionProps = {
    items: AccordionItem[];
};

function Accordion({ items }: AccordionProps) {
    const [openItem, setOpenItem] = useState<number | null>(null);

    const toggleItem = (id: number): void => {
        setOpenItem((prev) => (prev === id ? null : id));
    };

    return (
        <div>
            {items.map((item) => (
                <div key={item.id} className="border-b border-gray-200">
                    <button
                        onClick={() => toggleItem(item.id)}
                        className="w-full flex justify-between items-center py-4 text-left font-medium text-white hover:text-gray-100 transition"
                    >
                        {item.title}
                        <span className="ml-2 text-lg">
                            {openItem === item.id ? "−" : "+"}
                        </span>
                    </button>

                    {openItem === item.id && (
                        <div className="pb-4 text-gray-400 transition-all duration-300">
                            {item.content}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

export { Accordion };

export default function FAQs() {
    const { t } = useTranslation();

    const rawItems = t("landing.faqs.items", { returnObjects: true }) as Array<{
        question: string;
        answer: string;
    }>;

    const items: AccordionItem[] = Array.isArray(rawItems)
        ? rawItems.map((item, index) => ({
            id: index + 1,
            title: item.question,
            content: item.answer,
        }))
        : [];

    return (
        <div className="w-full max-w-5xl mx-auto mt-10 mb-10">
            <h2 className="text-3xl font-bold mb-4">{t("landing.faqs.title")}</h2>
            <Accordion items={items} />
        </div>
    );
}