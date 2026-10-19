import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <AppLogoIcon className="size-8 shrink-0" />
            <div className="ml-1 grid flex-1 text-left">
                <span className="truncate font-[family-name:var(--font-display)] text-[15px] leading-none font-semibold tracking-tight">
                    COD<span className="text-primary">Compta</span>
                </span>
            </div>
        </>
    );
}
