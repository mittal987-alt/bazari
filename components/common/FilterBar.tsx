import { Button } from "@/components/ui/button";

export default function FilterBar() {
  return (
    <div className="flex gap-3 overflow-x-auto">
      <Button variant="outline">Category</Button>
      <Button variant="outline">Price</Button>
      <Button variant="outline">Location</Button>
      <Button variant="outline">Newest</Button>
    </div>
  );
}
