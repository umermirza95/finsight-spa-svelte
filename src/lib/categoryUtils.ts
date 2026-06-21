import { 
	Banknote, TrendingUp, Landmark, PiggyBank, Wallet,
	HeartHandshake, Gift, Home, Zap, Building, ShoppingCart, Stethoscope,
	Plane, Utensils, Repeat, Ticket, Briefcase, Baby, PawPrint, Car,
	FileText, HelpCircle, LayoutGrid
} from 'lucide-svelte';

export function getCategoryStyle(key: string): { icon: any, color: string } {
	switch (key.toLowerCase()) {
		// Income & Financial
		case "dividend": return { icon: Banknote, color: "bg-emerald-100 text-emerald-700" };
		case "capital gains": return { icon: TrendingUp, color: "bg-teal-100 text-teal-700" };
		case "income": return { icon: Landmark, color: "bg-green-100 text-green-700" };
		case "savings account": return { icon: PiggyBank, color: "bg-cyan-100 text-cyan-700" };
		case "allowances": return { icon: Wallet, color: "bg-lime-100 text-lime-700" };
	
		// Religious & Giving
		case "zakat": return { icon: HeartHandshake, color: "bg-rose-100 text-rose-700" };
		case "gifts": 
		case "extras": return { icon: Gift, color: "bg-pink-100 text-pink-700" };

		// Household
		case "home": 
		case "housing": return { icon: Home, color: "bg-indigo-100 text-indigo-700" };
		case "utilities": return { icon: Zap, color: "bg-amber-100 text-amber-700" };
		case "rent": return { icon: Building, color: "bg-blue-100 text-blue-700" };
		case "groceries": return { icon: ShoppingCart, color: "bg-violet-100 text-violet-700" };
		case "healthcare": return { icon: Stethoscope, color: "bg-red-100 text-red-700" };

		// Lifestyle
		case "vacations": return { icon: Plane, color: "bg-sky-100 text-sky-700" };
		case "restaurants": return { icon: Utensils, color: "bg-orange-100 text-orange-700" };
		case "subscriptions": return { icon: Repeat, color: "bg-purple-100 text-purple-700" };
		case "entertainment": return { icon: Ticket, color: "bg-fuchsia-100 text-fuchsia-700" };
		case "business": return { icon: Briefcase, color: "bg-slate-100 text-slate-700" };

		// Family & Personal
		case "child": return { icon: Baby, color: "bg-yellow-100 text-yellow-700" };
		case "pet": return { icon: PawPrint, color: "bg-stone-100 text-stone-700" };

		// Transport
		case "transport": return { icon: Car, color: "bg-gray-100 text-gray-700" };

		// Compliance & Miscellaneous
		case "tax": return { icon: FileText, color: "bg-orange-100 text-orange-800" };
		case "untracked": return { icon: HelpCircle, color: "bg-zinc-100 text-zinc-600" };

		// Fallback
		default: return { icon: LayoutGrid, color: "bg-secondary text-secondary-foreground" };
	}
}
