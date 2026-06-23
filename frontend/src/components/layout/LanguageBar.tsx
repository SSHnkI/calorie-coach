import { LanguageSwitcher } from './LanguageSwitcher'

export function LanguageBar() {
  return (
    <div className="fixed right-4 top-4 z-[100]">
      <LanguageSwitcher />
    </div>
  )
}
