import { TextAlignStartIcon } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, type ComponentPropsWithRef } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./ui/drawer";

function BookDescriptionTrigger(props: ComponentPropsWithRef<"button">) {
  return (
    <Button className="self-start" variant="outline" {...props}>
      <TextAlignStartIcon />
      <span className="sr-only md:not-sr-only">Description</span>
    </Button>
  );
}

function BookDescriptionContent({
  description,
  className,
}: {
  description: string;
  className: string;
}) {
  return (
    <div className={className}>
      {description.split("\n").map((paragraph, i) => (
        <p key={i} className="mb-4 leading-normal">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

export function BookDescriptionDialog({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const dialogTitle = "Book description";
  const dialogDescription = `Full description of your book '${title}'`;

  if (!isMobile) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<BookDescriptionTrigger />} />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>
          <BookDescriptionContent
            description={description}
            className="-mx-4 overflow-y-auto max-h-[50vh] px-4"
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <BookDescriptionTrigger />
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{dialogTitle}</DrawerTitle>
          <DrawerDescription>{dialogDescription}</DrawerDescription>
        </DrawerHeader>
        <BookDescriptionContent
          description={description}
          className="no-scrollbar overflow-y-auto px-4"
        />
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
