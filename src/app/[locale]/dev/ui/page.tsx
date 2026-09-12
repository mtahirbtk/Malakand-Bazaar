"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { PriceRange } from "@/components/ui/price-range";
import { Modal } from "@/components/ui/modal";
import { Drawer } from "@/components/ui/drawer";
import { Lightbox } from "@/components/ui/lightbox";
import { Popover } from "@/components/ui/popover";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import { Avatar } from "@/components/ui/avatar";
import { Rating } from "@/components/ui/rating";
import { Price } from "@/components/ui/price";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Pagination } from "@/components/ui/pagination";
import { Tabs, TabPanel } from "@/components/ui/tabs";
import { Accordion } from "@/components/ui/accordion";
import { Carousel } from "@/components/ui/carousel";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { FileUpload } from "@/components/ui/file-upload";
import { MultiFileUpload } from "@/components/ui/multi-file-upload";
import { cn } from "@/lib/cn";
import { TEHSIL_OPTIONS } from "@/data/tehsils";
import { CATEGORY_OPTIONS, allSubcategoryOptions } from "@/data/categories";

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-surface-border bg-surface p-5 shadow-xs sm:p-6">
      <div className="mb-4 flex items-baseline gap-2 border-b border-surface-border pb-3">
        <h2 className="text-lg font-extrabold tracking-tight text-brand-700">{title}</h2>
        {count && (
          <span className="text-[11px] font-semibold text-on-surface-muted">{count}</span>
        )}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[160px_1fr] sm:gap-4">
      <div className="pt-1 text-[11px] font-bold uppercase tracking-wider text-on-surface-muted">
        {label}
      </div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function ToastButtons() {
  const { show } = useToast();
  return (
    <>
      <Button size="sm" onClick={() => show("Listing published")}>
        Success toast
      </Button>
      <Button size="sm" variant="ghost" onClick={() => show("Could not save", "error")}>
        Error toast
      </Button>
    </>
  );
}


const BRAND_RAMP = [
  { tone: "50", cls: "bg-brand-50", hex: "#f0f9f5", ratio: "—", role: "tinted surfaces, dropdown hover" },
  { tone: "100", cls: "bg-brand-100", hex: "#def2e8", ratio: "—", role: "selected rows, soft badges, avatars" },
  { tone: "200", cls: "bg-brand-200", hex: "#bce1d0", ratio: "—", role: "borders of selected elements" },
  { tone: "300", cls: "bg-brand-300", hex: "#8ec7af", ratio: "1.92", role: "resting control borders" },
  { tone: "400", cls: "bg-brand-400", hex: "#59ab89", ratio: "2.76", role: "hover borders" },
  { tone: "500", cls: "bg-brand-500", hex: "#3d8f6e", ratio: "3.92", role: "UI shapes only — chevrons, tracks" },
  { tone: "600", cls: "bg-brand-600", hex: "#2d7659", ratio: "5.46", role: "the workhorse — icons, active states, focus" },
  { tone: "700", cls: "bg-brand-700", hex: "#255f48", ratio: "7.48", role: "section headings, dialog titles" },
  { tone: "800", cls: "bg-brand-800", hex: "#1f4d3a", ratio: "9.63", role: "RESERVED — primary CTA, price, page title" },
  { tone: "900", cls: "bg-brand-900", hex: "#133426", ratio: "13.58", role: "text on tinted brand grounds" },
];

const ACCENTS = [
  { cls: "bg-accent-green-dark", hex: "#418532", label: "accent-green-dark", role: "WhatsApp / direct contact only", white: "4.54:1 pass" },
  { cls: "bg-accent-green", hex: "#50a23e", label: "accent-green", role: "decoration & hover only", white: "3.19:1 — no small text" },
  { cls: "bg-tertiary", hex: "#c89b6d", label: "tertiary (sand)", role: "price emphasis, featured badges, stars", white: "2.51:1 — dark text only" },
  { cls: "bg-on-surface", hex: "#16231d", label: "on-surface", role: "all body copy — not green", white: "16.25:1 pass" },
];

function PaletteSection() {
  return (
    <Section title="Palette" count="one hue, ten tones, strict roles">
      <div className="space-y-1">
        {BRAND_RAMP.map((t) => (
          <div key={t.tone} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-brand-50">
            <div className={cn("h-9 w-16 shrink-0 rounded-md border border-black/5", t.cls)} />
            <div className="w-20 shrink-0">
              <div className="text-xs font-extrabold text-on-surface">brand-{t.tone}</div>
              <div className="tabular text-[10px] text-on-surface-muted">{t.hex}</div>
            </div>
            <div className="tabular w-14 shrink-0 text-[10px] font-semibold text-on-surface-muted">
              {t.ratio === "—" ? "—" : `${t.ratio}:1`}
            </div>
            <div className="text-[11px] text-on-surface-muted">{t.role}</div>
          </div>
        ))}
      </div>

      <div className="space-y-1 border-t border-surface-border pt-4">
        {ACCENTS.map((a) => (
          <div key={a.label} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-brand-50">
            <div className={cn("h-9 w-16 shrink-0 rounded-md border border-black/5", a.cls)} />
            <div className="w-32 shrink-0">
              <div className="text-xs font-extrabold text-on-surface">{a.label}</div>
              <div className="tabular text-[10px] text-on-surface-muted">{a.hex}</div>
            </div>
            <div className="w-40 shrink-0 text-[10px] font-semibold text-on-surface-muted">
              white on it: {a.white}
            </div>
            <div className="text-[11px] text-on-surface-muted">{a.role}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export default function GalleryPage() {
  const [tehsil, setTehsil] = React.useState("all");
  const [category, setCategory] = React.useState("");
  const [subcategory, setSubcategory] = React.useState("");
  const [checked, setChecked] = React.useState(true);
  const [condition, setCondition] = React.useState("new");
  const [mapOn, setMapOn] = React.useState(false);
  const [range, setRange] = React.useState<[number, number]>([1000, 450000]);
  const [single, setSingle] = React.useState([40]);
  const [rating, setRating] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [tab, setTab] = React.useState("details");
  const [modal, setModal] = React.useState(false);
  const [drawerSide, setDrawerSide] = React.useState<
    "left" | "right" | "bottom" | null
  >(null);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState(0);
  const [filePreview, setFilePreview] = React.useState<string>("");
  const [multiFileUrls, setMultiFileUrls] = React.useState<string[]>([]);

  const subOptions = React.useMemo(() => allSubcategoryOptions(), []);

  return (
    <TooltipProvider>
      <ToastProvider>
        <main className="mx-auto w-full max-w-[1100px] flex-1 space-y-6 px-4 py-8">
          <header className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-accent-green-dark">
              MalakandBazaar Design System
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight text-primary">
              Component Gallery
            </h1>
            <p className="text-sm text-on-surface-muted">
              Every global component, every variant and state. No native browser
              controls anywhere on this page.
            </p>
          </header>

          <PaletteSection />

          <Section title="Buttons">
            <Row label="Variants">
              <Button variant="primary">Become a Seller</Button>
              <Button variant="ghost">Secondary</Button>
              <Button variant="sand">Feature Boost</Button>
              <Button variant="whatsapp">
                <Icon name="chat" size={15} />
                WhatsApp
              </Button>
              <Button variant="subtle">View All</Button>
            </Row>
            <Row label="Sizes">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </Row>
            <Row label="States">
              <Button disabled>Disabled</Button>
              <Button asChild>
                <a href="#buttons">As anchor</a>
              </Button>
            </Row>
          </Section>

          <Section title="Text inputs">
            <Row label="Sizes & icons">
              <div className="w-56">
                <Input placeholder="Default field" aria-label="Default field" />
              </div>
              <div className="w-56">
                <Input
                  inputSize="sm"
                  leadingIcon="search"
                  placeholder="Search listings"
                  aria-label="Search listings"
                />
              </div>
              <div className="w-56">
                <Input
                  trailingIcon="location_on"
                  placeholder="Locality"
                  aria-label="Locality"
                />
              </div>
            </Row>
            <Row label="Invalid">
              <div className="w-56">
                <Input invalid defaultValue="0300" aria-label="Invalid field" />
              </div>
            </Row>
            <Row label="Textarea">
              <div className="w-full max-w-md">
                <Textarea placeholder="Describe your listing in detail…" />
              </div>
            </Row>
            <Row label="Form fields">
              <div className="grid w-full gap-4 sm:grid-cols-3">
                <FormField label="Title" hint="Be specific" htmlFor="g-title" required>
                  <Input id="g-title" placeholder="Honda CD 70 2024" />
                </FormField>
                <FormField label="Price" error="Price is required" htmlFor="g-price">
                  <Input id="g-price" invalid placeholder="PKR" />
                </FormField>
                <FormField label="Phone" hint="+92 300 1234567" htmlFor="g-phone">
                  <Input id="g-phone" placeholder="3001234567" />
                </FormField>
              </div>
            </Row>
          </Section>

          <Section title="Select & Combobox" count="444 subcategories loaded">
            <Row label="Select">
              <Select
                ariaLabel="Tehsil"
                value={tehsil}
                onValueChange={setTehsil}
                options={TEHSIL_OPTIONS}
              />
              <Select
                ariaLabel="Tehsil bare"
                variant="bare"
                selectSize="sm"
                value={tehsil}
                onValueChange={setTehsil}
                options={TEHSIL_OPTIONS}
                className="text-primary"
              />
            </Row>
            <Row label="Combobox">
              <Combobox
                ariaLabel="Category"
                value={category}
                onValueChange={setCategory}
                options={CATEGORY_OPTIONS}
                placeholder="All Sectors"
                searchPlaceholder="Search categories"
                emptyText="No category found"
                className="w-56"
              />
              <Combobox
                ariaLabel="Subcategory"
                value={subcategory}
                onValueChange={setSubcategory}
                options={subOptions}
                placeholder="Any subcategory"
                searchPlaceholder="Type to narrow 444 options"
                emptyText="No subcategory found"
                className="w-72"
              />
            </Row>
          </Section>

          <Section title="Selection controls">
            <Row label="Checkbox">
              <div className="w-64">
                <Checkbox
                  checked={checked}
                  onCheckedChange={setChecked}
                  label="In Stock & Ready"
                />
                <Checkbox
                  checked={false}
                  onCheckedChange={() => {}}
                  label="Batkhela Main Road"
                  count={54}
                />
                <Checkbox
                  disabled
                  checked={false}
                  onCheckedChange={() => {}}
                  label="Marked as Sold"
                  count={3}
                />
              </div>
            </Row>
            <Row label="Radio">
              <RadioGroup
                ariaLabel="Condition"
                value={condition}
                onValueChange={setCondition}
                options={[
                  { value: "new", label: "New" },
                  { value: "used", label: "Used" },
                  { value: "refurbished", label: "Refurbished" },
                ]}
              />
            </Row>
            <Row label="Switch">
              <Switch checked={mapOn} onCheckedChange={setMapOn} label="Show map view" />
            </Row>
          </Section>

          <Section title="File uploads">
            <Row label="Single file">
              <FileUpload
                label="Upload Photo"
                previewUrl={filePreview}
                onFileSelected={(file) => {
                  const url = URL.createObjectURL(file);
                  setFilePreview(url);
                }}
                onClear={() => setFilePreview("")}
              />
            </Row>
            <Row label="Multiple files">
              <div className="w-full max-w-lg">
                <MultiFileUpload
                  label="Add"
                  urls={multiFileUrls}
                  onAdd={(file) => {
                    const url = URL.createObjectURL(file);
                    setMultiFileUrls((prev) => [...prev, url]);
                  }}
                  onRemove={(index) => {
                    setMultiFileUrls((prev) => prev.filter((_, i) => i !== index));
                  }}
                />
              </div>
            </Row>
          </Section>

          <Section title="Sliders">
            <Row label="Single">
              <div className="w-64">
                <Slider
                  ariaLabel="Distance"
                  min={0}
                  max={100}
                  value={single}
                  onValueChange={setSingle}
                />
              </div>
            </Row>
            <Row label="Price range">
              <div className="w-72">
                <PriceRange
                  min={0}
                  max={5800000}
                  value={range}
                  onChange={setRange}
                  onApply={() => {}}
                  labels={{
                    from: "From",
                    to: "To",
                    apply: "Apply Price Filter",
                    highest: "The highest price in selection is",
                  }}
                />
              </div>
            </Row>
          </Section>

          <Section title="Overlays">
            <Row label="Triggers">
              <Button size="sm" onClick={() => setModal(true)}>
                Open modal
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDrawerSide("left")}>
                Drawer left
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDrawerSide("right")}>
                Drawer right
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDrawerSide("bottom")}>
                Drawer bottom
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setLightboxOpen(true)}>
                Lightbox
              </Button>
              <Popover trigger={<Button size="sm" variant="subtle">Popover</Button>}>
                <p className="w-48 text-xs text-on-surface-muted">
                  Sellers are contacted directly. MalakandBazaar takes no commission.
                </p>
              </Popover>
              <Tooltip label="Call this seller">
                <Button size="sm" variant="subtle">
                  <Icon name="call" size={15} />
                  Hover me
                </Button>
              </Tooltip>
              <DropdownMenu
                ariaLabel="Account"
                trigger={<Button size="sm" variant="subtle">Account menu</Button>}
                items={[
                  { label: "My Listings", icon: "list" },
                  { label: "Post a Listing", icon: "add_circle" },
                  { label: "Profile Settings", icon: "settings" },
                  { label: "Sign Out", icon: "logout" },
                ]}
              />
            </Row>
            <Row label="Toast">
              <ToastButtons />
            </Row>
          </Section>

          <Section title="Display">
            <Row label="Badges">
              <Badge tone="primary">PTA Approved</Badge>
              <Badge tone="sand">2 Yr Warranty</Badge>
              <Badge tone="green" icon="verified">
                Verified
              </Badge>
              <Badge tone="neutral">Tier-1 Grade A</Badge>
              <Badge tone="danger">Reported</Badge>
            </Row>
            <Row label="Chips">
              <Chip label="Batkhela" active onClick={() => {}} />
              <Chip label="Dargai" onClick={() => {}} />
              <Chip label="Thana Baizai" count={31} onClick={() => {}} />
              <Chip label='Search: "Solar Inverter"' onRemove={() => {}} />
            </Row>
            <Row label="Avatars">
              <Avatar initials="KS" alt="Khan Solar" size="sm" />
              <Avatar initials="BO" alt="Batkhela Orchards" size="md" />
              <Avatar initials="MM" alt="Malakand Motors" size="lg" />
            </Row>
            <Row label="Rating">
              <Rating value={4.9} count={142} />
              <Rating
                editable
                value={rating}
                onChange={setRating}
                ariaLabel="Your rating"
              />
            </Row>
            <Row label="Price">
              <Price value={2800} size="sm" />
              <Price value={240000} compareAt={265000} />
              <Price value={5800000} size="lg" />
            </Row>
            <Row label="Skeleton">
              <div className="w-64 space-y-2">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </Row>
            <Row label="Empty state">
              <div className="w-full max-w-md">
                <EmptyState
                  icon="search_off"
                  title="No listings found"
                  body="Try widening your price range or selecting another tehsil."
                  action={<Button size="sm" variant="ghost">Clear all filters</Button>}
                />
              </div>
            </Row>
          </Section>

          <Section title="Navigation">
            <Row label="Breadcrumb">
              <Breadcrumb
                items={[
                  { label: "Home", href: "#" },
                  { label: "Solar & Energy", href: "#" },
                  { label: "Solar Inverters" },
                ]}
              />
            </Row>
            <Row label="Tabs">
              <div className="w-full max-w-md">
                <Tabs
                  value={tab}
                  onValueChange={setTab}
                  tabs={[
                    { value: "details", label: "Details", icon: "info" },
                    { value: "seller", label: "Seller", icon: "storefront" },
                    { value: "location", label: "Location", icon: "location_on" },
                  ]}
                >
                  <TabPanel value="details" className="pt-3 text-xs text-on-surface-muted">
                    Heavy duty VFD inverter built for tubewell loads.
                  </TabPanel>
                  <TabPanel value="seller" className="pt-3 text-xs text-on-surface-muted">
                    Khan Solar &amp; Engineering, Dargai Industrial Belt.
                  </TabPanel>
                  <TabPanel value="location" className="pt-3 text-xs text-on-surface-muted">
                    Dargai Industrial Belt, Malakand District.
                  </TabPanel>
                </Tabs>
              </div>
            </Row>
            <Row label="Accordion">
              <div className="w-full max-w-md">
                <Accordion
                  defaultOpen={["tehsil"]}
                  items={[
                    {
                      value: "tehsil",
                      title: "Locality / Tehsil",
                      content: (
                        <div>
                          <Checkbox checked onCheckedChange={() => {}} label="Batkhela" count={54} />
                          <Checkbox checked={false} onCheckedChange={() => {}} label="Dargai" count={38} />
                          <Checkbox checked={false} onCheckedChange={() => {}} label="Thana Baizai" count={31} />
                        </div>
                      ),
                    },
                    {
                      value: "availability",
                      title: "Stock & Availability",
                      content: (
                        <div>
                          <Checkbox checked onCheckedChange={() => {}} label="Available" count={94} />
                          <Checkbox checked={false} onCheckedChange={() => {}} label="Sold" count={3} />
                        </div>
                      ),
                    },
                    {
                      value: "seller",
                      title: "Seller Type",
                      content: (
                        <div>
                          <Checkbox checked={false} onCheckedChange={() => {}} label="Verified merchants" />
                          <Checkbox checked={false} onCheckedChange={() => {}} label="Individual sellers" />
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
            </Row>
            <Row label="Pagination">
              <div className="w-full space-y-3">
                <Pagination
                  page={page}
                  pageCount={4}
                  onPageChange={setPage}
                  labels={{ previous: "Previous", next: "Next", page: "Page" }}
                />
                <Pagination
                  page={10}
                  pageCount={20}
                  onPageChange={() => {}}
                  labels={{ previous: "Previous", next: "Next", page: "Page" }}
                />
                <Pagination
                  page={20}
                  pageCount={20}
                  onPageChange={() => {}}
                  labels={{ previous: "Previous", next: "Next", page: "Page" }}
                />
              </div>
            </Row>
          </Section>

          <Section title="Carousel">
            <Carousel
              ariaLabel="Gallery demo"
              className="h-56 rounded-2xl"
              slides={[
                <div
                  key="a"
                  className="flex h-56 items-center justify-center bg-primary text-lg font-extrabold text-white"
                >
                  Slide One — Primary
                </div>,
                <div
                  key="b"
                  className="flex h-56 items-center justify-center bg-secondary text-lg font-extrabold text-white"
                >
                  Slide Two — Secondary
                </div>,
                <div
                  key="c"
                  className="flex h-56 items-center justify-center bg-tertiary text-lg font-extrabold text-white"
                >
                  Slide Three — Sand
                </div>,
              ]}
            />
          </Section>

          <Modal
            open={modal}
            onOpenChange={setModal}
            title="Report this listing"
            description="Tell us what is wrong and our team will review it."
          >
            <div className="space-y-4">
              <FormField label="Reason" htmlFor="g-reason">
                <Select
                  ariaLabel="Reason"
                  value=""
                  onValueChange={() => {}}
                  placeholder="Choose a reason"
                  options={[
                    { value: "fake", label: "Fake or misleading listing" },
                    { value: "sold", label: "Already sold" },
                    { value: "wrong", label: "Wrong phone number" },
                    { value: "prohibited", label: "Prohibited item" },
                  ]}
                  className="w-full"
                />
              </FormField>
              <FormField label="Details" htmlFor="g-details">
                <Textarea id="g-details" placeholder="Add anything that helps us check." />
              </FormField>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setModal(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setModal(false)}>Submit report</Button>
              </div>
            </div>
          </Modal>

          <Drawer
            open={drawerSide !== null}
            onOpenChange={(open) => !open && setDrawerSide(null)}
            title="Filters"
            side={drawerSide ?? "left"}
          >
            <div className="space-y-4">
              <Checkbox checked onCheckedChange={() => {}} label="Batkhela" count={54} />
              <Checkbox checked={false} onCheckedChange={() => {}} label="Dargai" count={38} />
              <PriceRange
                min={0}
                max={5800000}
                value={range}
                onChange={setRange}
                onApply={() => setDrawerSide(null)}
                labels={{
                  from: "From",
                  to: "To",
                  apply: "Apply Price Filter",
                  highest: "The highest price in selection is",
                }}
              />
            </div>
          </Drawer>

          <Lightbox
            images={["/images/seed/1.jpg", "/images/seed/2.jpg"]}
            alt="Gallery preview"
            index={lightboxIndex}
            onIndexChange={setLightboxIndex}
            open={lightboxOpen}
            onOpenChange={setLightboxOpen}
          />
        </main>
      </ToastProvider>
    </TooltipProvider>
  );
}
