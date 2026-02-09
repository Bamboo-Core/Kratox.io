'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';

interface FadeInProps {
    children: ReactNode;
    className?: string;
    delay?: number;
    direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

export default function FadeIn({ children, className = '', delay = 0, direction = 'up' }: FadeInProps) {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            {
                threshold: 0.1,
                rootMargin: '50px',
            }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            if (ref.current) {
                observer.unobserve(ref.current);
            }
        };
    }, []);

    const getDirectionClass = () => {
        switch (direction) {
            case 'up': return 'translate-y-10';
            case 'down': return '-translate-y-10';
            case 'left': return 'translate-x-10';
            case 'right': return '-translate-x-10';
            case 'none': return '';
            default: return 'translate-y-10';
        }
    };

    return (
        <div
            ref={ref}
            className={`transition-all duration-700 ease-out ${className} ${isVisible ? 'opacity-100 translate-y-0 translate-x-0' : `opacity-0 ${getDirectionClass()}`
                }`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
}
