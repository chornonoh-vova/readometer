import { InfoIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useState, type ComponentPropsWithRef } from "react";
import { ResponsiveDrawerDialog } from "./responsive-drawer-dialog";

function BookDescriptionTrigger(props: ComponentPropsWithRef<"button">) {
  return (
    <Button className="self-start" variant="outline" {...props}>
      <InfoIcon />
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

  const dialogTitle = "Book description";
  const dialogDescription = `Full description of your book '${title}'`;

  return (
    <ResponsiveDrawerDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<BookDescriptionTrigger />}
      title={dialogTitle}
      description={dialogDescription}
      close={
        <Button variant="outline" className="flex-1">
          Close
        </Button>
      }
    >
      <BookDescriptionContent
        description={description}
        className="md:-mx-4 overflow-y-auto md:max-h-[50vh] px-4 pb-2"
      />
    </ResponsiveDrawerDialog>
  );
}
