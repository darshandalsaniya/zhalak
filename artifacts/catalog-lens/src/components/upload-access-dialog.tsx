import { useState, type ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function UploadAccessDialog({ trigger, onConfirm }: {
  trigger: ReactElement;
  onConfirm: (token: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Enter your access code</DialogTitle>
          <DialogDescription>Video analysis requires the shared demo access code.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => {
          event.preventDefault();
          const code = new FormData(event.currentTarget).get('accessCode');
          if (typeof code !== 'string' || !code.trim()) return;
          setOpen(false);
          onConfirm(code.trim());
        }}>
          <div className="space-y-2">
            <Label htmlFor="upload-access-code">Access code</Label>
            <Input id="upload-access-code" name="accessCode" type="password" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={128} required />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" data-testid="button-submit-access-code">Analyze video</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
