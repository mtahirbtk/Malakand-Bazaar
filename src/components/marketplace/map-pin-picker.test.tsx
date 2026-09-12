import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MapPinPicker } from "./map-pin-picker";

vi.mock("leaflet/dist/leaflet.css", () => ({}));
vi.mock("leaflet/dist/images/marker-icon-2x.png", () => ({ default: { src: "" } }));
vi.mock("leaflet/dist/images/marker-icon.png", () => ({ default: { src: "" } }));
vi.mock("leaflet/dist/images/marker-shadow.png", () => ({ default: { src: "" } }));
vi.mock("leaflet", () => ({ default: { icon: () => ({}) } }));
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TileLayer: () => null,
  useMapEvents: () => null,
  Marker: ({ eventHandlers }: { eventHandlers?: { dragend?: (e: unknown) => void } }) => (
    <button
      type="button"
      data-testid="marker"
      onClick={() =>
        eventHandlers?.dragend?.({ target: { getLatLng: () => ({ lat: 34.7, lng: 72.1 }) } })
      }
    />
  ),
}));

describe("MapPinPicker", () => {
  it("calls onChange with the marker's new position on drag end", async () => {
    const onChange = vi.fn();
    render(<MapPinPicker value={{ lat: 34.5, lng: 71.9 }} onChange={onChange} ariaLabel="Store location" />);
    await userEvent.click(screen.getByTestId("marker"));
    expect(onChange).toHaveBeenCalledWith({ lat: 34.7, lng: 72.1 });
  });

  it("labels the picker for assistive tech", () => {
    render(<MapPinPicker value={{ lat: 34.5, lng: 71.9 }} onChange={() => {}} ariaLabel="Store location" />);
    expect(screen.getByRole("group", { name: "Store location" })).toBeInTheDocument();
  });
});
