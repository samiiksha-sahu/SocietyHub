import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin, COOKIE_NAME } from "@/const";
import { trpc } from "@/lib/trpc";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { AlertCircle, ArrowUpRight, Bell, Building2, Camera, CheckCircle2, ChevronRight, Clock3, FileText, LayoutDashboard, LifeBuoy, LogOut, Megaphone, Plus, ShieldCheck, Sparkles, TrendingUp, Wrench, X } from "lucide-react";
import { useMemo, useState } from "react";
import axios from "axios";
import { useLocation, Redirect } from "wouter";

const statusCopy: Record<string, string> = { open: "Open", in_progress: "In Progress", resolved: "Resolved" };
const categoryCopy: Record<string, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  lift: "Lift/Elevator",
  housekeeping: "Housekeeping",
  security: "Security",
  other: "Civil/Other"
};

const getAuthToken = () => {
  try {
    const raw = sessionStorage.getItem("manus-cookie");
    if (raw) {
      const prefix = `${COOKIE_NAME}=`;
      const pair = raw.split(";").find(s => s.trim().startsWith(prefix));
      const token = pair?.trim().slice(prefix.length);
      if (token) return token;
    }
  } catch {}
  return null;
};
const priorityCopy: Record<string, string> = { low: "Low", medium: "Medium", high: "High" };

function formatUnitContext(unitStr: string | null | undefined, isAdmin?: boolean, societyName?: string | null) {
  const socName = societyName || "Green Valley Heights";
  if (isAdmin) return `Operations Room • ${socName}`;
  if (!unitStr || unitStr === "Unassigned") return `Wing A - Flat 402 • ${socName}`;
  const clean = unitStr.replace(/^Flat\s+/i, "");
  const match = clean.match(/^([A-Za-z])[- ]*(\d+)/);
  if (match) {
    return `Wing ${match[1].toUpperCase()} - Flat ${match[2]} • ${socName}`;
  }
  return `${unitStr} • ${socName}`;
}

function StatusBadge({ status, overdue }: { status: string; overdue?: boolean }) {
  if (overdue) {
    return (
      <Badge variant="outline" className="rounded-full border border-[#E53935] bg-white px-3 py-1 text-xs font-semibold text-[#E53935] flex items-center gap-1.5 shrink-0">
        <span className="h-1.5 w-1.5 rounded-full bg-[#E53935]" />
        ⚠️ Overdue
      </Badge>
    );
  }
  switch (status) {
    case "open":
      return (
        <Badge variant="outline" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full border border-slate-400 bg-transparent" />
          Open
        </Badge>
      );
    case "in_progress":
      return (
        <Badge variant="outline" className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-900 flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] leading-none select-none">◐</span>
          In Progress
        </Badge>
      );
    case "resolved":
      return (
        <Badge variant="outline" className="rounded-full border border-slate-900 bg-slate-900 px-3 py-1 text-xs font-semibold text-white flex items-center gap-1.5 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
          Resolved
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full border border-slate-400 bg-transparent" />
          {status}
        </Badge>
      );
  }
}

function PriorityBadge({ priority }: { priority: string }) {
  switch (priority) {
    case "high":
      return (
        <span className="inline-flex items-center rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-900">
          High
        </span>
      );
    case "medium":
      return (
        <span className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
          Medium
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
          Low
        </span>
      );
  }
}

function StatCard({ label, value, detail, icon: Icon, tone }: { label: string; value: number | string; detail: string; icon: any; tone: string }) {
  return (
    <Card className="border border-slate-200 bg-white shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-md cursor-pointer">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{detail}</p>
          </div>
          <div className={`rounded-xl p-2.5 ${tone}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#334155]">
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded bg-[#E53935] text-white">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="text-base font-bold tracking-tight text-[#0F172A]">
              Society<span className="text-[#E53935]">Hub</span>
            </span>
          </div>
          <Button onClick={() => setLocation("/login")} className="rounded-xl bg-[#0F172A] px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:brightness-110 active:translate-y-0">
            Sign In
          </Button>
        </header>

        <main className="grid items-center gap-10 pb-16 pt-12 lg:grid-cols-[1.1fr_.9fr] lg:pt-16">
          <div>
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-[#E53935]">
              <Sparkles className="h-3 w-3" /> Reliable Society Operations
            </div>
            <h1 className="max-w-xl text-3xl font-extrabold tracking-tight text-[#0F172A] sm:text-4xl lg:text-5xl leading-tight">
              Maintenance Management, handled with <span className="text-[#E53935]">clarity.</span>
            </h1>
            <p className="mt-4 max-w-md text-sm md:text-base leading-relaxed text-[#334155]">
              SocietyHub connects residents and facility management teams into a single, accountable workflow—from issue reporting to final resolution.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => setLocation("/login")} size="lg" className="rounded-xl bg-[#E53935] px-6 hover:bg-[#C62828] text-white shadow-md shadow-red-100 hover:shadow-lg transition-all duration-200 font-semibold">
                Open your dashboard <ArrowUpRight className="ml-2 h-4 w-4 inline" />
              </Button>
              <div className="flex items-center gap-1.5 px-1 text-xs text-[#64748B]">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> Authorized access only
              </div>
            </div>
          </div>

          <div className="relative">
            <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-md hover:border-slate-300">
              <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#64748B]">Society Overview</p>
                    <p className="mt-0.5 text-xs font-semibold text-[#0F172A]">Green Valley Heights</p>
                  </div>
                  <div className="rounded border border-slate-200 bg-white p-1.5 shadow-sm">
                    <Bell className="h-3.5 w-3.5 text-slate-500" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 p-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-700">Open</p>
                  <p className="mt-1.5 text-3xl font-extrabold text-slate-900">12</p>
                </div>
                <div className="rounded-xl border border-slate-300 bg-slate-100 p-5 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-900">In Progress</p>
                  <p className="mt-1.5 text-3xl font-extrabold text-slate-950">08</p>
                </div>
                <div className="rounded-xl border border-slate-900 bg-slate-900 p-5 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white">Resolved</p>
                  <p className="mt-1.5 text-3xl font-extrabold text-white">64</p>
                </div>
              </div>

              <div className="space-y-2.5 px-4 pb-5">
                <div className="flex items-center gap-3 rounded border border-slate-100 p-4">
                  <div className="rounded bg-slate-100 p-2 text-slate-600">
                    <Wrench className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-[#0F172A]">Water pressure in kitchen</p>
                    <p className="mt-0.5 text-[10px] text-[#64748B]">Flat B-402 • Plumbing</p>
                  </div>
                  <StatusBadge status="in_progress" />
                </div>
                <div className="flex items-center gap-3 rounded border border-red-100 bg-red-50/20 p-4">
                  <div className="rounded bg-red-100/50 p-2 text-[#E53935]">
                    <AlertCircle className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-[#0F172A]">Basement light outage</p>
                    <p className="mt-0.5 text-[10px] text-[#64748B]">Block A • Electrical</p>
                  </div>
                  <StatusBadge status="open" overdue={true} />
                </div>
              </div>
            </Card>
          </div>
        </main>

        <div className="grid gap-6 border-t border-slate-200 py-6 sm:grid-cols-3">
          <div className="p-6 rounded-2xl border border-slate-200/80 bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-slate-300 flex gap-4">
            <div className="rounded border border-slate-200 bg-white p-2 text-[#E53935] shadow-sm shrink-0 h-fit">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#0F172A]">Detailed Requests</p>
              <p className="mt-1 text-[11px] text-[#64748B] leading-relaxed">Photos, priority, logs, and comments kept together in a central audit trail.</p>
            </div>
          </div>
          <div className="p-6 rounded-2xl border border-slate-200/80 bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-slate-300 flex gap-4">
            <div className="rounded border border-slate-200 bg-white p-2 text-blue-600 shadow-sm shrink-0 h-fit">
              <Clock3 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#0F172A]">Accountability timeline</p>
              <p className="mt-1 text-[11px] text-[#64748B] leading-relaxed">State changes record administrative notes and updates for complete transparency.</p>
            </div>
          </div>
          <div className="p-6 rounded-2xl border border-slate-200/80 bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-slate-300 flex gap-4">
            <div className="rounded border border-slate-200 bg-white p-2 text-emerald-600 shadow-sm shrink-0 h-fit">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#0F172A]">Management Oversight</p>
              <p className="mt-1 text-[11px] text-[#64748B] leading-relaxed">Society administrators track queues and resolve issues before they escalate.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubmitComplaint({ onDone }: { onDone: (id?: number) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<any>("plumbing");
  const [description, setDescription] = useState("");
  const [photoData, setPhotoData] = useState<string>();
  const [photoMeta, setPhotoMeta] = useState<{ name: string; type: string }>();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers,
        body: JSON.stringify({
          title,
          category,
          description,
          photoUrl: photoData || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert("Error submitting complaint: " + JSON.stringify(err));
        setSubmitting(false);
        return;
      }

      const createdObj = await res.json();
      toast.success("Complaint submitted successfully");
      setOpen(false);
      setTitle("");
      setDescription("");
      setPhotoData(undefined);
      setPhotoMeta(undefined);
      onDone(createdObj.id);
    } catch (err: any) {
      toast.error("Failed to submit complaint: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded bg-[#E53935] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#C62828] transition-colors">
          <Plus className="mr-1.5 h-4 w-4" /> Raise Complaint
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-[#0F172A]">Raise Maintenance Complaint</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#334155]">Complaint Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Water leak from kitchen geyser"
              className="rounded border-slate-200 text-xs shadow-none focus-visible:ring-[#E53935]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#334155]">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="rounded border-slate-200 text-xs shadow-none focus-visible:ring-[#E53935]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(categoryCopy).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#334155]">Describe the Issue</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide key details for the maintenance team..."
              className="min-h-24 rounded border-slate-200 text-xs shadow-none focus-visible:ring-[#E53935]"
            />
            <p className="mt-1 text-[11px] leading-normal text-[#64748B]">
              Describe the exact location (e.g., Master Bathroom Geyser) to help the society technician resolve it faster.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#334155]">Photo Attachment (Optional)</label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded border border-dashed border-slate-300 bg-slate-50/50 p-4 transition-colors hover:border-[#E53935] hover:bg-red-50/10">
              <Camera className="h-4 w-4 text-[#64748B]" />
              <span className="text-xs text-[#64748B]">
                {photoMeta?.name ?? "Upload a photo of the issue"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setPhotoMeta({ name: file.name, type: file.type });
                  const reader = new FileReader();
                  reader.onload = () => setPhotoData(String(reader.result));
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          </div>
          <Button
            disabled={submitting || !title || description.length < 3}
            onClick={handleSubmit}
            className="w-full rounded bg-[#E53935] text-xs font-bold text-white hover:bg-[#C62828] disabled:opacity-50"
          >
            {submitting ? "Submitting Request..." : "Submit Complaint"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResidentView({ user }: { user: any }) {
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();
  const complaints = useQuery({
    queryKey: ["/api/complaints"],
    queryFn: async () => {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/complaints", { headers });
      if (!res.ok) throw new Error("Failed to fetch complaints");
      return res.json();
    },
    enabled: !!user,
  });
  const notices = trpc.notices.list.useQuery(undefined, { enabled: !!user });
  const notifications = trpc.notifications.mine.useQuery(undefined, { enabled: !!user });
  const [selected, setSelected] = useState<number>();
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);

  const detail = trpc.complaints.detail.useQuery({ id: selected! }, { enabled: !!selected });

  const refresh = (newId?: number) => {
    queryClient.invalidateQueries({ queryKey: ["/api/complaints"] });
    queryClient.refetchQueries({ queryKey: ["/api/complaints"] });
    utils.notifications.mine.invalidate();
    if (newId) {
      setSelected(newId);
    }
  };

  const items = (complaints.data as any[]) ?? [];

  return (
    <DashboardShell user={user} role="Resident" noticeContent={<NoticeBoard notices={notices.data ?? []} />}>
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#E53935]">
            Good morning, {user.name?.split(" ")[0] ?? "Member"}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0F172A]">Resident Dashboard</h1>
          <p className="text-xs text-[#64748B]">Raise and track maintenance requests for your unit.</p>
        </div>
        <SubmitComplaint onDone={refresh} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="My Complaints"
          value={items.length}
          detail="Total requests submitted"
          icon={FileText}
          tone="bg-slate-50 text-slate-700 border border-slate-200"
        />
        <StatCard
          label="In Progress"
          value={items.filter((x) => x.status === "in_progress").length}
          detail="Technician working"
          icon={Clock3}
          tone="bg-slate-100 text-slate-900 border border-slate-300"
        />
        <StatCard
          label="Resolved"
          value={items.filter((x) => x.status === "resolved").length}
          detail="Closed successfully"
          icon={CheckCircle2}
          tone="bg-slate-900 text-white border border-slate-900"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold text-[#0F172A]">Recent Complaints</CardTitle>
              <p className="text-xs text-[#64748B]">Status of your submitted maintenance issues.</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.length === 0 ? (
              <EmptyState text="No active complaints in your flat. Everything looks good!" />
            ) : (
              items.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelected(item.id)}
                  className="flex w-full items-center gap-3 rounded border border-slate-100 p-3 text-left transition hover:bg-slate-50 cursor-pointer"
                >
                  <div className="rounded bg-slate-100 p-2 text-[#334155]">
                    <Wrench className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-[#0F172A]">{item.title}</p>
                    <p className="mt-0.5 text-[11px] text-[#64748B]">
                      {categoryCopy[item.category]} • {new Date(item.createdAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                  
                  {item.photoUrl && (
                    <div className="shrink-0 relative group">
                      <img
                        src={item.photoUrl}
                        alt="Thumbnail"
                        className="h-8 w-8 rounded object-cover border border-slate-200 hover:brightness-90 transition cursor-zoom-in"
                        onClick={(e) => {
                          e.stopPropagation();
                          setZoomedPhoto(item.photoUrl);
                        }}
                      />
                    </div>
                  )}
                  
                  <PriorityBadge priority={item.priority} />
                  <StatusBadge status={item.status} overdue={item.isOverdue} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-1.5 text-sm font-bold text-[#0F172A]">
              <Megaphone className="h-4 w-4 text-[#E53935]" /> Notice Board
            </CardTitle>
            <p className="text-xs text-[#64748B]">Latest circulars from the society committee.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {(notices.data ?? []).slice(0, 3).map(({ notice }: any) => (
              <div key={notice.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-2">
                  {notice.isPinned && (
                    <span className="rounded bg-slate-900 border border-slate-900 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-white">
                      PINNED
                    </span>
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">{notice.category}</span>
                </div>
                <p className="mt-1 text-xs font-bold text-[#0F172A]">{notice.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-[#334155]">{notice.body}</p>
                <p className="mt-1 text-[10px] text-[#64748B]">
                  {new Date(notice.createdAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}
                </p>
              </div>
            ))}
            {!(notices.data?.length) && <EmptyState text="No active announcements on the board." />}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-[#0F172A]">Email Notification Log</CardTitle>
            <p className="text-xs text-[#64748B]">Fallback verification of automated email alerts.</p>
          </CardHeader>
          <CardContent>
            {(notifications.data ?? []).length ? (
              <div className="space-y-2">
                {notifications.data?.slice(0, 4).map((n) => (
                  <div key={n.id} className="flex items-start gap-2 text-xs">
                    <div className="mt-0.5 rounded-full bg-slate-100 p-1 text-slate-700 border border-slate-200">
                      <CheckCircle2 className="h-3 w-3" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[#334155]">{n.message}</p>
                      <p className="text-[10px] text-[#64748B] mt-0.5">{new Date(n.createdAt).toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="Notification logs will show here when activity occurs on your complaints." />
            )}
          </CardContent>
        </Card>
      </div>

      {selected && (
        <Dialog open onOpenChange={() => setSelected(undefined)}>
          <DialogContent className="max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#0F172A]">Complaint #SR-{selected}</DialogTitle>
            </DialogHeader>
            {detail.data && (
              <div className="space-y-4 pt-2">
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">{detail.data.title}</h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <StatusBadge status={detail.data.status} overdue={detail.data.isOverdue} />
                    <PriorityBadge priority={detail.data.priority} />
                    <span className="text-[11px] font-semibold text-[#64748B] bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                      {categoryCopy[detail.data.category]}
                    </span>
                  </div>
                </div>

                {detail.data.isOverdue && (
                  <div className="rounded border border-[#E53935] bg-white p-3 text-xs text-[#E53935] font-medium flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-[#E53935] shrink-0 mt-0.5" />
                    <span>Flagged: Unresolved for &gt; 3 days. Priority escalated to Society Committee.</span>
                  </div>
                )}

                {detail.data.status === "resolved" && (
                  <div className="rounded-lg border border-slate-900 bg-slate-900 p-3.5 text-xs text-white font-medium">
                    <div className="flex items-center gap-1.5 font-bold text-white mb-1">
                      <CheckCircle2 className="h-4 w-4 text-white" /> Ticket Resolved & Closed
                    </div>
                    {detail.data.resolutionNote ? (
                      <p className="mt-1 leading-relaxed">{detail.data.resolutionNote}</p>
                    ) : (
                      <p className="mt-1 italic text-slate-300">No resolution note provided.</p>
                    )}
                  </div>
                )}

                <div>
                  <p className="text-xs font-bold text-[#334155]">Description</p>
                  <p className="mt-1 text-xs text-[#334155] leading-relaxed bg-slate-50/50 p-2.5 rounded border border-slate-100">
                    {detail.data.description}
                  </p>
                </div>

                {detail.data.photoUrl && (
                  <div>
                    <p className="text-xs font-bold text-[#334155] mb-1">Attachment</p>
                    <img
                      src={detail.data.photoUrl}
                      alt="Complaint attachment"
                      className="max-h-48 w-full rounded border border-slate-200 object-cover cursor-zoom-in hover:brightness-95 transition"
                      onClick={() => setZoomedPhoto(detail.data.photoUrl)}
                    />
                  </div>
                )}

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#64748B]">Resolution Timeline</p>
                  <div className="relative border-l-2 border-slate-100 pl-5 ml-2 space-y-4">
                    {detail.data.history.map((h: any) => (
                      <div key={h.history.id} className="relative">
                        <span className="absolute -left-[27px] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white border-2 border-[#E53935]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#E53935]" />
                        </span>
                        <div>
                          <p className="text-xs font-bold text-[#0F172A]">{statusCopy[h.history.newStatus]}</p>
                          {h.history.adminNote && (
                            <p className="mt-1 rounded bg-slate-50 p-2 text-[11px] leading-relaxed text-[#334155] border border-slate-100">
                              {h.history.adminNote}
                            </p>
                          )}
                          <p className="mt-0.5 text-[10px] text-[#64748B]">
                            {h.actor?.name ?? "System"} • {new Date(h.history.createdAt).toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {zoomedPhoto && (
        <Dialog open={!!zoomedPhoto} onOpenChange={() => setZoomedPhoto(null)}>
          <DialogContent className="max-w-2xl p-1 bg-black border-none rounded-lg shadow-2xl overflow-hidden">
            <div className="relative flex justify-center items-center bg-slate-950">
              <button
                onClick={() => setZoomedPhoto(null)}
                className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors z-50"
              >
                <X className="h-4.5 w-4.5" />
              </button>
              <img
                src={zoomedPhoto}
                alt="Zoomed attachment"
                className="w-full h-auto max-h-[75vh] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DashboardShell>
  );
}

function AdminView({ user }: { user: any }) {
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();
  const complaints = useQuery({
    queryKey: ["/api/complaints"],
    queryFn: async () => {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/complaints", { headers });
      if (!res.ok) throw new Error("Failed to fetch complaints");
      return res.json();
    },
    enabled: !!user,
  });
  const analytics = trpc.analytics.overview.useQuery(undefined, { enabled: !!user });
  const notices = trpc.notices.list.useQuery(undefined, { enabled: !!user });

  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [unitSearch, setUnitSearch] = useState("");
  const [selected, setSelected] = useState<any>();

  const update = trpc.complaints.update.useMutation({
    onSuccess: () => {
      toast.success("Complaint updated successfully");
      queryClient.invalidateQueries({ queryKey: ["/api/complaints"] });
      queryClient.refetchQueries({ queryKey: ["/api/complaints"] });
      utils.analytics.overview.invalidate();
      setSelected(undefined);
    },
    onError: (e) => toast.error(e.message),
  });

  const sorted = useMemo(() => {
    return ((complaints.data as any[]) ?? [])
      .filter((c) => {
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "overdue" && c.isOverdue) ||
          c.status === statusFilter;
        const matchesCategory = categoryFilter === "all" || c.category === categoryFilter;
        const matchesSearch =
          !unitSearch.trim() ||
          c.residentUnit?.toLowerCase().includes(unitSearch.toLowerCase()) ||
          c.residentName?.toLowerCase().includes(unitSearch.toLowerCase()) ||
          c.title?.toLowerCase().includes(unitSearch.toLowerCase());
        return matchesStatus && matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [complaints.data, statusFilter, categoryFilter, unitSearch]);

  const allComplaints = (complaints.data as any[]) ?? [];
  const counts = useMemo(() => {
    const total = allComplaints.length;
    const open = allComplaints.filter(c => c.status === 'Open' || c.status === 'open').length;
    const inProgress = allComplaints.filter(c => c.status === 'In Progress' || c.status === 'in_progress').length;
    const resolved = allComplaints.filter(c => c.status === 'Resolved' || c.status === 'resolved').length;
    const overdue = allComplaints.filter(c => c.isOverdue || (
      c.status !== 'Resolved' && c.status !== 'resolved' && 
      Math.floor((Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24)) >= 3
    )).length;
    return { total, open, inProgress, resolved, overdue };
  }, [allComplaints]);

  const byCategory = useMemo(() => {
    const cats = ["plumbing", "electrical", "lift", "housekeeping", "security", "other"];
    return cats.map(cat => ({
      label: cat,
      count: allComplaints.filter(c => c.category === cat).length
    }));
  }, [allComplaints]);

  const byPriority = useMemo(() => {
    const priorities = ["high", "medium", "low"];
    return priorities.map(pri => ({
      label: pri,
      count: allComplaints.filter(c => c.priority === pri).length
    }));
  }, [allComplaints]);

  return (
    <DashboardShell
      user={user}
      role="Admin"
      noticeContent={<NoticeBoard notices={notices.data ?? []} adminAction={<NoticeComposer onDone={() => notices.refetch()} />} />}
    >
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#E53935]">
            Operations Control Room
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0F172A]">Facility Management Dashboard</h1>
          <p className="text-xs text-[#64748B]">Triage incoming requests, dispatch maintenance technicians, and resolve society tickets.</p>
        </div>
        <NoticeComposer onDone={() => notices.refetch()} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total Requests"
          value={counts.total}
          detail="Cumulative history"
          icon={LayoutDashboard}
          tone="bg-slate-50 text-slate-700 border border-slate-200"
        />
        <StatCard
          label="Open Issues"
          value={counts.open}
          detail="Need attention"
          icon={AlertCircle}
          tone="bg-slate-50 text-slate-700 border border-slate-200"
        />
        <StatCard
          label="Active Tickets"
          value={counts.inProgress}
          detail="In progress"
          icon={Clock3}
          tone="bg-slate-100 text-slate-900 border border-slate-300"
        />
        <StatCard
          label="Resolved"
          value={counts.resolved}
          detail="Successfully closed"
          icon={CheckCircle2}
          tone="bg-slate-900 text-white border border-slate-900"
        />
        <StatCard
          label="Overdue (SLA)"
          value={counts.overdue}
          detail="Passed 3-day threshold"
          icon={LifeBuoy}
          tone="bg-white text-[#E53935] border border-[#E53935]"
        />
      </div>

      {counts.overdue > 0 && (
        <div className="mt-6 rounded border border-[#E53935] bg-white p-4 text-xs text-[#E53935] flex items-start gap-3 shadow-sm animate-pulse">
          <AlertCircle className="h-5 w-5 text-[#E53935] shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-extrabold text-[#E53935] text-sm">Action Required: {counts.overdue} Overdue Complaints</h4>
            <p className="mt-0.5 leading-relaxed">
              Flagged: Unresolved for &gt; 3 days. Priority escalated to Society Committee. Please update task status and add administrative notes.
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
        <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex flex-col gap-3">
              <div>
                <CardTitle className="text-sm font-bold text-[#0F172A]">Complaint Queue</CardTitle>
                <p className="text-xs text-[#64748B]">Triage list. Overdue items are pinned to the top automatically.</p>
              </div>

              <div className="space-y-2.5">
                {/* Search Bar */}
                <div className="flex items-center gap-2">
                  <Input
                    value={unitSearch}
                    onChange={(e) => setUnitSearch(e.target.value)}
                    placeholder="Search by Flat, Resident name, or title..."
                    className="h-8 max-w-sm rounded border-slate-200 text-xs shadow-none focus-visible:ring-[#E53935]"
                  />
                </div>

                {/* Status Filter Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mr-2">Status:</span>
                  {[
                    ["all", "All"],
                    ["open", "Open"],
                    ["in_progress", "In Progress"],
                    ["resolved", "Resolved"],
                    ["overdue", "⚠️ Overdue"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setStatusFilter(key)}
                      className={`rounded px-2.5 py-1 text-xs font-semibold border transition ${
                        statusFilter === key
                          ? "bg-[#0F172A] border-[#0F172A] text-white shadow-sm"
                          : "bg-white border-slate-200 text-[#334155] hover:bg-slate-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Category Filter Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mr-1">Category:</span>
                  {[
                    ["all", "All"],
                    ["plumbing", "Plumbing"],
                    ["electrical", "Electrical"],
                    ["lift", "Lift"],
                    ["housekeeping", "Housekeeping"],
                    ["security", "Security"],
                    ["other", "Civil"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setCategoryFilter(key)}
                      className={`rounded px-2.5 py-1 text-xs font-semibold border transition ${
                        categoryFilter === key
                          ? "bg-[#E53935] border-[#E53935] text-white shadow-sm"
                          : "bg-white border-slate-200 text-[#334155] hover:bg-slate-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {sorted.length === 0 ? (
              <div className="p-6 text-center">
                <EmptyState text="No active complaints in the society queue. Everything looks good!" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 px-4">Ticket details</th>
                      <th className="py-3 px-4">Resident / Unit</th>
                      <th className="py-3 px-4">Date raised</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">View details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((item: any) => (
                      <tr
                        key={item.id}
                        onClick={() => setSelected(item)}
                        className={`border-b border-slate-100 hover:bg-slate-50/70 transition cursor-pointer ${
                          item.isOverdue ? "bg-slate-50" : ""
                        }`}
                      >
                        <td className="py-3 px-4 max-w-[200px]">
                          <div className="flex flex-col">
                            <span className="font-bold text-[#0F172A] truncate flex items-center gap-1">
                              {item.title}
                              {item.isOverdue && (
                                <span className="rounded bg-[#E53935] px-1 py-0.5 text-[8px] font-extrabold uppercase text-white">
                                  SLA RISK
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-[#64748B] mt-0.5">
                              {categoryCopy[item.category]}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-[#334155]">{item.residentName}</span>
                            <span className="text-[10px] text-[#64748B]">{item.residentUnit}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[#64748B]">
                          {new Date(item.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={item.priority}
                            onValueChange={(val) =>
                              update.mutate({
                                id: item.id,
                                status: item.status,
                                priority: val as any,
                              })
                            }
                            disabled={item.status === "resolved" || update.isPending}
                          >
                            <SelectTrigger className="h-7 w-24 text-[11px] rounded border-slate-200 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(priorityCopy).map(([k, v]) => (
                                <SelectItem key={k} value={k} className="text-xs">
                                  {v}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={item.status}
                            onValueChange={(val) =>
                              update.mutate({
                                id: item.id,
                                status: val as any,
                                priority: item.priority,
                              })
                            }
                            disabled={item.status === "resolved" || update.isPending}
                          >
                            <SelectTrigger className="h-7 w-28 text-[11px] rounded border-slate-200 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(statusCopy).map(([k, v]) => (
                                <SelectItem key={k} value={k} className="text-xs">
                                  {v}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(item);
                            }}
                            className="text-[#E53935] hover:text-[#C62828] font-bold text-xs"
                          >
                            Manage →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-sm h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-[#0F172A]">Workload Metrics</CardTitle>
            <p className="text-xs text-[#64748B]">Distribution of tickets across components.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {byCategory.map((row: any) => {
              const max = Math.max(...byCategory.map((x: any) => x.count), 1);
              return (
                <div key={row.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-semibold text-[#334155]">{categoryCopy[row.label] ?? row.label}</span>
                    <span className="text-[#64748B]">{row.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100">
                    <div
                      className="h-1.5 rounded-full bg-[#E53935]"
                      style={{ width: `${(row.count / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {!(byCategory.some((c: any) => c.count > 0)) && <EmptyState text="No workload data available." />}

            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">By Priority</p>
              <div className="grid grid-cols-3 gap-2">
                {byPriority.map((row: any) => (
                  <div key={row.label} className="rounded border border-slate-100 bg-slate-50/50 p-2.5 text-center">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#64748B]">
                      {priorityCopy[row.label] ?? row.label}
                    </p>
                    <p className="mt-0.5 text-lg font-extrabold text-[#0F172A]">{row.count}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {selected && (
        <AdminDrawer
          item={selected}
          onClose={() => setSelected(undefined)}
          onSave={(v: any) => update.mutate(v)}
          pending={update.isPending}
        />
      )}
    </DashboardShell>
  );
}

function AdminDrawer({ item, onClose, onSave, pending }: any) {
  const detail = trpc.complaints.detail.useQuery({ id: item.id });
  const [status, setStatus] = useState(item.status);
  const [priority, setPriority] = useState(item.priority);
  const [note, setNote] = useState("");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-[#0F172A]">Manage Complaint #SR-{item.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <h3 className="text-xs font-bold text-[#0F172A]">{item.title}</h3>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={item.status} overdue={item.isOverdue} />
              <span className="text-[10px] text-[#64748B]">
                Raised by {item.residentName} ({item.residentUnit})
              </span>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Description</p>
            <p className="mt-1 rounded border border-slate-100 bg-slate-50/50 p-2.5 text-xs leading-relaxed text-[#334155]">
              {item.description}
            </p>
          </div>

          {item.photoUrl && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1">Attached Image</p>
              <img
                src={item.photoUrl}
                alt="Complaint attachment"
                className="max-h-40 w-full rounded border border-slate-200 object-cover"
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-[#64748B] uppercase">Status</label>
              <Select value={status} onValueChange={setStatus} disabled={item.status === "resolved"}>
                <SelectTrigger className="h-8 rounded border-slate-200 text-xs shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusCopy).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-[#64748B] uppercase">Priority</label>
              <Select value={priority} onValueChange={setPriority} disabled={item.status === "resolved"}>
                <SelectTrigger className="h-8 rounded border-slate-200 text-xs shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityCopy).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold text-[#64748B] uppercase">Resolution / Admin Note</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add status details or resolution note here..."
              className="min-h-16 rounded border-slate-200 text-xs shadow-none focus-visible:ring-[#E53935]"
            />
          </div>

          <Button
            disabled={pending || item.status === "resolved"}
            onClick={() => onSave({ id: item.id, status, priority, note })}
            className="w-full rounded bg-[#E53935] text-xs font-bold text-white hover:bg-[#C62828] transition-colors"
          >
            {item.status === "resolved" ? "Ticket Permanently Resolved" : pending ? "Saving Updates..." : "Save Ticket Update"}
          </Button>

          <div className="border-t border-slate-100 pt-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Audit Timeline</p>
            <div className="relative border-l-2 border-slate-100 pl-5 ml-2 space-y-3.5">
              {(detail.data?.history ?? []).map((entry: any) => (
                <div key={entry.history.id} className="relative">
                  <span className="absolute -left-[27px] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white border-2 border-[#E53935]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#E53935]" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-[#0F172A]">
                      {entry.history.previousStatus ? `${statusCopy[entry.history.previousStatus]} → ` : "Submitted as "}
                      {statusCopy[entry.history.newStatus]}
                    </p>
                    {entry.history.adminNote && (
                      <p className="mt-1 rounded bg-slate-50 p-2 text-[11px] leading-relaxed text-[#334155] border border-slate-100">
                        {entry.history.adminNote}
                      </p>
                    )}
                    <p className="mt-0.5 text-[10px] text-[#64748B]">
                      {entry.actor?.name ?? "System"} • {new Date(entry.history.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NoticeComposer({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<any>("maintenance");
  const [isPinned, setIsPinned] = useState(false);

  const mutation = trpc.notices.create.useMutation({
    onSuccess: () => {
      toast.success("Notice published");
      setOpen(false);
      setTitle("");
      setBody("");
      setIsPinned(false);
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded bg-[#0F172A] px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-sm">
          <Megaphone className="mr-1.5 h-4 w-4" /> Publish Circular
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-[#0F172A]">Publish Notice Circular</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#334155]">Notice Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Water Tank Cleaning Schedule"
              className="rounded border-slate-200 text-xs shadow-none focus-visible:ring-[#E53935]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#334155]">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="rounded border-slate-200 text-xs shadow-none focus-visible:ring-[#E53935]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["maintenance", "security", "community", "emergency"].map((x) => (
                  <SelectItem key={x} value={x} className="text-xs">
                    {x[0].toUpperCase() + x.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#334155]">Circular Body Content</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Provide circular text and specific instructions for society members..."
              className="min-h-24 rounded border-slate-200 text-xs shadow-none focus-visible:ring-[#E53935]"
            />
          </div>
          <button
            onClick={() => setIsPinned(!isPinned)}
            className={`flex w-full items-center gap-3.5 rounded border p-3 text-left text-xs font-semibold transition ${
              isPinned
                ? "border-slate-300 bg-slate-50 text-slate-900 font-extrabold"
                : "border-slate-200 bg-white text-[#64748B] hover:bg-slate-50"
            }`}
          >
            <div className={`h-4.5 w-4.5 rounded border flex items-center justify-center ${isPinned ? "border-slate-800 bg-slate-900 text-white" : "border-slate-300 bg-white"}`}>
              {isPinned && <CheckCircle2 className="h-3 w-3 text-white" />}
            </div>
            <span>Pin as important notification and alert residents</span>
          </button>
          <Button
            disabled={mutation.isPending || !title || body.length < 3}
            onClick={() => mutation.mutate({ title, body, category, isPinned })}
            className="w-full rounded bg-[#E53935] text-xs font-bold text-white hover:bg-[#C62828] disabled:opacity-50"
          >
            {mutation.isPending ? "Publishing Circular..." : "Publish Circular"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NoticeBoard({ notices, adminAction }: { notices: any[]; adminAction?: React.ReactNode }) {
  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#E53935]">Official Board</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0F172A]">Society Notice Board</h1>
          <p className="text-xs text-[#64748B]">Important announcements, maintenance schedules, and security protocols.</p>
        </div>
        {adminAction}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {notices.map(({ notice }: any) => (
          <div
            key={notice.id}
            className={`relative overflow-hidden rounded border bg-white shadow-sm transition ${
              notice.isPinned
                ? "border-slate-300 ring-1 ring-slate-300 bg-slate-50/20"
                : "border-slate-200"
            }`}
          >
            {/* Pinned Circular Top Header */}
            <div
              className={`px-4 py-2 text-center text-[10px] font-extrabold uppercase tracking-widest ${
                notice.isPinned ? "bg-slate-100 text-slate-800" : "bg-slate-50 text-[#334155] border-b border-slate-100"
              }`}
            >
              {notice.isPinned ? "📌 Pinned Society Circular" : "Society Circular"}
            </div>
            <div className="p-5">
              <div className="mb-2.5 flex items-center justify-between text-[10px] text-[#64748B]">
                <span>Ref: SH/2026/N-{notice.id}</span>
                <span>
                  {new Date(notice.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#0F172A] mb-2">{notice.title}</h3>
              <p className="text-xs text-[#334155] leading-relaxed whitespace-pre-wrap">{notice.body}</p>

              <div className="mt-4 pt-2.5 border-t border-dashed border-slate-200 flex justify-between items-center text-[10px] text-[#64748B]">
                <span className="font-bold uppercase">Category: {notice.category}</span>
                <span className="font-semibold text-slate-700">Issued by: Society Committee</span>
              </div>
            </div>
          </div>
        ))}
        {!notices.length && (
          <div className="md:col-span-2">
            <EmptyState text="No active notices on the board." />
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardShell({
  user,
  role,
  children,
  noticeContent,
}: {
  user: any;
  role: string;
  children: React.ReactNode;
  noticeContent?: React.ReactNode;
}) {
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const handleLogout = async () => {
    try {
      await axios.post("/api/auth/logout");
      sessionStorage.removeItem("manus-cookie");
      toast.success("Successfully logged out");
      window.location.href = "/login";
    } catch (err) {
      toast.error("Failed to sign out");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <aside className="fixed inset-y-0 left-0 hidden w-[240px] border-r border-slate-200 bg-white lg:block">
        <div className="flex h-full flex-col p-5">
          <div className="flex items-center gap-2 px-2">
            <div className="grid h-8 w-8 place-items-center rounded bg-[#E53935] text-white">
              <Building2 className="h-4.5 w-4.5" />
            </div>
            <span className="font-bold tracking-tight text-[#0F172A]">
              Society<span className="text-[#E53935]">Hub</span>
            </span>
          </div>

          <div className="mt-8 px-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Workspace</p>
            <nav className="mt-3 space-y-1">
              <button
                onClick={() => setNoticeOpen(false)}
                className={`flex w-full items-center gap-3 border-l-4 px-3 py-2 text-left text-xs font-bold transition ${
                  !noticeOpen
                    ? "border-[#E53935] bg-red-50/40 text-[#E53935]"
                    : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-[#0F172A]"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                {role === "Admin" ? "Queue Manager" : "My Dashboard"}
              </button>

              <button
                onClick={() => setNoticeOpen(true)}
                className={`flex w-full items-center gap-3 border-l-4 px-3 py-2 text-left text-xs font-bold transition ${
                  noticeOpen
                    ? "border-[#E53935] bg-red-50/40 text-[#E53935]"
                    : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-[#0F172A]"
                }`}
              >
                <Megaphone className="h-4 w-4" /> Notice Board
              </button>
            </nav>
          </div>

          <div className="mt-auto rounded border border-slate-200 bg-slate-50/50 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#64748B]">Signed in as</p>
            <p className="mt-1 truncate text-xs font-bold text-[#0F172A]">{user.name ?? "Member"}</p>
            <p className="mt-0.5 truncate text-[10px] text-[#64748B]">
              {role} • {user.unit ?? "Unassigned"}
            </p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[240px]">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-3.5 backdrop-blur sm:px-8">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between">
            <div className="lg:hidden flex items-center gap-2 font-bold text-[#0F172A]">
              <div className="grid h-7 w-7 place-items-center rounded bg-[#E53935] text-white">
                <Building2 className="h-4 w-4" />
              </div>
              SocietyHub
            </div>

            <div className="hidden text-xs font-semibold text-[#334155] lg:block">
              {formatUnitContext(user.unit, role === "Admin", user.societyName)}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setNoticeOpen(true)}
                className="rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-[#334155] hover:bg-slate-50 lg:hidden"
              >
                <Megaphone className="mr-1 inline h-3.5 w-3.5 text-[#E53935]" /> Notices
              </button>
              <div className="hidden items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 sm:flex">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-500" /> System Operational
              </div>
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-[#0F172A] text-xs font-bold text-white border border-slate-200 cursor-pointer focus:outline-none hover:bg-slate-800 transition"
                >
                  {user.name?.[0]?.toUpperCase() ?? "U"}
                </button>
                {profileOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setProfileOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-slate-200 shadow-xl p-2 text-[#334155] z-40">
                      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        My Account
                      </div>
                      <div className="px-2 py-1.5">
                        <p className="text-xs font-bold text-[#0F172A] truncate">{user.name ?? "Member"}</p>
                        <p className="text-[10px] text-[#64748B] truncate">{user.email ?? ""}</p>
                      </div>
                      <div className="bg-slate-100 h-px my-1" />
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          handleLogout();
                        }}
                        className="w-full text-left flex items-center gap-2 rounded px-2 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer transition"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] px-5 py-6 sm:px-8">
          {noticeOpen && noticeContent ? (
            <div>
              <button
                onClick={() => setNoticeOpen(false)}
                className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#64748B] hover:text-[#0F172A]"
              >
                ← Back to Overview
              </button>
              {noticeContent}
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded border border-dashed border-slate-200 bg-slate-50/20 px-5 py-8 text-center text-xs font-medium text-[#64748B]">
      {text}
    </div>
  );
}

export default function Home() {
  const { user, loading } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F8FAFC]">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-[#E53935]" />
      </div>
    );
  }

  // Guard: Not logged in
  if (!user) {
    if (location === "/" || location === "") {
      return <Landing />;
    }
    return <Redirect to="/login" />;
  }

  // Redirect from root / to respective dashboard when logged in
  if (location === "/" || location === "") {
    if (user.role === "admin") {
      return <Redirect to="/dashboard/admin" />;
    } else {
      return <Redirect to="/dashboard/resident" />;
    }
  }

  // Dashboard role guards
  if (location === "/dashboard/admin") {
    if (user.role === "admin") {
      return <AdminView user={user} />;
    } else {
      return <Redirect to="/dashboard/resident" />;
    }
  }

  if (location === "/dashboard/resident") {
    if (user.role === "admin") {
      return <Redirect to="/dashboard/admin" />;
    } else {
      return <ResidentView user={user} />;
    }
  }

  // Fallback
  return user.role === "admin" ? <AdminView user={user} /> : <ResidentView user={user} />;
}
