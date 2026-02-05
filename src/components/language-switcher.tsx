'use client';

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages } from 'lucide-react';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const getCurrentFlag = () => {
    switch (i18n.language) {
      case 'pt':
        return <FlagBR className="h-5 w-5" />;
      case 'es':
        return <FlagES className="h-5 w-5" />;
      default:
        return <FlagUS className="h-5 w-5" />;
    }
  };

  return (
    <div className="flex items-center gap-2">
      {getCurrentFlag()}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="hover:bg-orange-500 hover:text-white">
            <Languages className="h-5 w-5" />
            <span className="sr-only">Toggle language</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => changeLanguage('en')} className='focus:bg-orange-500 focus:text-white cursor-pointer gap-2'>
            <FlagUS className="h-4 w-4" />
            {t('languages.en')} (English)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => changeLanguage('pt')} className='focus:bg-orange-500 focus:text-white cursor-pointer gap-2'>
            <FlagBR className="h-4 w-4" />
            {t('languages.pt')} (Português)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => changeLanguage('es')} className='focus:bg-orange-500 focus:text-white cursor-pointer gap-2'>
            <FlagES className="h-4 w-4" />
            {t('languages.es')} (Español)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function FlagUS({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 480"
      className={className}
    >
      <g fillRule="evenodd">
        <path fill="#bd3d44" d="M0 0h640v480H0" />
        <path
          stroke="#fff"
          strokeWidth="37"
          d="M0 55.3h640M0 129h640M0 203h640M0 277h640M0 351h640M0 425h640"
        />
        <path fill="#192f5d" d="M0 0h296v258H0" />
        <marker
          id="us-a"
          markerHeight="30"
          markerWidth="30"
        >
          <path fill="#fff" d="m15 0 9 27-24-17h29l-23 17z" />
        </marker>
        <path
          fill="none"
          markerMid="url(#us-a)"
          d="M37 25h222M37 67h222M37 108h222M37 150h222M37 192h222M37 233h222M74 46h148M74 88h148M74 129h148M74 171h148M74 213h148"
        />
      </g>
    </svg>
  );
}

function FlagBR({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 480"
      className={className}
    >
      <path fill="#009b3a" d="M0 0h640v480H0z" />
      <path fill="#fedf00" d="m320 42-264 198 264 198 264-198z" />
      <circle cx="320" cy="240" r="114" fill="#002776" />
      <path
        fill="#fff"
        d="M211.5 258c7.5-68.5 253-38.5 210.5-35.5m-190.5 24.5 3-1.5m10 5 1-2.5m44-24.5 2-1.5m-30 20.5 2.5-1m34.5-27 2-.5m-17.5 26.5 2.5-2m22-26.5 2-1m-14 36 2.5-1.5m32-35.5 1.5-1.5m-20.5 45.5-2.5 1.5"
      />
    </svg>
  );
}

function FlagES({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 480"
      className={className}
    >
      <path fill="#aa151b" d="M0 0h640v480H0z" />
      <path fill="#f1bf00" d="M0 120h640v240H0z" />
    </svg>
  );
}
