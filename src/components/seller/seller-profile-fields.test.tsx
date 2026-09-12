import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { SellerProfileFields, MALAKAND_CENTER, type SellerProfileFieldsValue } from "./seller-profile-fields";

vi.mock("leaflet/dist/leaflet.css", () => ({}));
vi.mock("leaflet/dist/images/marker-icon-2x.png", () => ({ default: { src: "" } }));
vi.mock("leaflet/dist/images/marker-icon.png", () => ({ default: { src: "" } }));
vi.mock("leaflet/dist/images/marker-shadow.png", () => ({ default: { src: "" } }));
vi.mock("leaflet", () => ({ default: { icon: () => ({}) } }));
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TileLayer: () => null,
  useMapEvents: () => null,
  Marker: () => null,
}));

const BASE_VALUE: SellerProfileFieldsValue = {
  storeName: "",
  description: "",
  storePhone: "",
  tehsilSlug: "batkhela",
  localitySlug: "batkhela-city",
  coordinates: MALAKAND_CENTER,
  avatarUrl: "",
  storefrontBanner: "",
};

function Wrapper({ onChange }: { onChange: (value: SellerProfileFieldsValue) => void }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <SellerProfileFields value={BASE_VALUE} onChange={onChange} />
    </NextIntlClientProvider>
  );
}

describe("SellerProfileFields", () => {
  it("reports store name changes via onChange", async () => {
    const onChange = vi.fn();
    render(<Wrapper onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Store Name"), "G");
    expect(onChange).toHaveBeenCalledWith({ ...BASE_VALUE, storeName: "G" });
  });

  it("resets locality when tehsil changes", async () => {
    const onChange = vi.fn();
    render(<Wrapper onChange={onChange} />);
    await userEvent.click(screen.getByRole("combobox", { name: "Tehsil" }));
    await userEvent.click(await screen.findByRole("option", { name: "Dargai" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ tehsilSlug: "dargai", localitySlug: expect.any(String) })
    );
  });

  it("renders the map picker labelled for the store location", async () => {
    render(<Wrapper onChange={() => {}} />);
    expect(await screen.findByRole("group", { name: "Store Location" })).toBeInTheDocument();
  });
});
