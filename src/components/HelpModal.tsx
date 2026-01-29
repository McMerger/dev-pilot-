
import { X, HelpCircle, Laptop } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

export function HelpModal() {
    return (
        <Dialog.Root>
            <Dialog.Trigger asChild>
                <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-md transition-colors" title="Help">
                    <HelpCircle className="w-4 h-4" />
                </button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity" />
                <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[90vw] max-w-md bg-card border border-border rounded-lg shadow-2xl z-50 p-6 focus:outline-none">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Laptop className="w-5 h-5 text-primary" />
                            Supported IDEs
                        </h2>
                        <Dialog.Close asChild>
                            <button className="p-1 rounded-full hover:bg-accent/50 text-muted-foreground transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </Dialog.Close>
                    </div>

                    <div className="space-y-4 text-sm text-foreground/90">
                        <p>
                            Splitline works by modifying files directly on your disk. It is compatible with <strong>any IDE</strong> that detects file changes.
                        </p>

                        <div className="grid gap-3">
                            <div className="p-3 bg-muted/30 rounded-md border border-border/50">
                                <div className="font-medium mb-1">VS Code / Cursor / Windsurf</div>
                                <div className="text-xs text-muted-foreground">Changes appear instantly. Use the Timeline view to see diffs.</div>
                            </div>

                            <div className="p-3 bg-muted/30 rounded-md border border-border/50">
                                <div className="font-medium mb-1">JetBrains (IntelliJ, WebStorm)</div>
                                <div className="text-xs text-muted-foreground">Enable <em>"Synchronize files on frame activation"</em> or <em>"Save files automatically"</em>.</div>
                            </div>

                            <div className="p-3 bg-muted/30 rounded-md border border-border/50">
                                <div className="font-medium mb-1">Neovim / Vim</div>
                                <div className="text-xs text-muted-foreground">Use <code>:e!</code> or enable <code>autoread</code> to see external changes.</div>
                            </div>
                        </div>

                        <div className="pt-2 text-xs text-muted-foreground text-center">
                            Splitline connects via Local Agent
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
