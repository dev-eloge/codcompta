export default function HeadingSmall({ title, description }: { title: string; description?: string }) {
    return (
        <header>
            <h2 className="mb-0.5 text-base font-semibold">{title}</h2>
            {description && <p className="text-muted-foreground text-sm">{description}</p>}
        </header>
    );
}
