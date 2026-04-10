import {
  Car,
  Home,
  Smartphone,
  Shirt,
  Briefcase,
  Sofa,
} from "lucide-react";

const categories = [
  { name: "Cars", icon: Car },
  { name: "Property", icon: Home },
  { name: "Mobiles", icon: Smartphone },
  { name: "Fashion", icon: Shirt },
  { name: "Jobs", icon: Briefcase },
  { name: "Furniture", icon: Sofa },
];

export default function CategoryGrid() {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">
        Browse Categories
      </h2>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.name}
            className="flex flex-col items-center gap-2 p-4 border rounded-xl hover:shadow-md cursor-pointer transition"
          >
            <cat.icon className="h-6 w-6 text-blue-600" />
            <span className="text-sm font-medium">
              {cat.name}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
