"use client";

import { useActionState, useState } from "react";
import { Check, LoaderCircle, Truck } from "lucide-react";
import { saveBookDeliveryAction } from "@/app/admin/books/[bookId]/actions";
import type { BookDelivery, BookDeliveryState } from "@/lib/books/delivery";

export function BookDeliveryForm({ bookId, delivery, loadError }: { bookId: string; delivery: BookDelivery | null; loadError?: string }) {
  const [pickup, setPickup] = useState(delivery?.pickup ?? false);
  const [city, setCity] = useState(delivery?.city ?? "");
  const [address, setAddress] = useState(delivery?.address ?? "");
  const [edited, setEdited] = useState(false);
  const [state, action, pending] = useActionState<BookDeliveryState, FormData>(saveBookDeliveryAction, {});
  return <section className="book-delivery" aria-labelledby="book-delivery-heading">
    <header><Truck size={20} aria-hidden="true" /><div><h2 id="book-delivery-heading">Доставка</h2><p>Укажите, как передать готовую книгу.</p></div></header>
    <form action={action} onChange={() => setEdited(true)} onSubmit={() => setEdited(false)}>
      <input type="hidden" name="bookId" value={bookId} />
      <fieldset disabled={pending || Boolean(loadError)}>
        <label className="book-delivery-pickup"><input type="checkbox" name="pickup" checked={pickup} onChange={event => setPickup(event.target.checked)} /><span>Самовывоз</span></label>
        <fieldset className="book-delivery-fields" hidden={pickup} disabled={pickup}>
          <label htmlFor="book-delivery-city">Город<input id="book-delivery-city" name="city" value={city} onChange={event => setCity(event.target.value)} maxLength={120} required={!pickup} autoComplete="shipping address-level2" placeholder="Например, Алматы" /></label>
          <label htmlFor="book-delivery-address">Адрес<textarea id="book-delivery-address" name="address" value={address} onChange={event => setAddress(event.target.value)} maxLength={500} required={!pickup} autoComplete="shipping street-address" placeholder="Улица, дом, квартира" rows={2} /></label>
        </fieldset>
        {pickup && <p className="book-delivery-note">Книга будет передана самовывозом. Город и адрес доставки не требуются.</p>}
        <footer><span role="status">{loadError ?? (!edited ? state.error ?? (state.success ? "Доставка сохранена" : "") : "")}</span><button className="content-primary-button" type="submit" disabled={pending || Boolean(loadError)}>{pending ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}Сохранить доставку</button></footer>
      </fieldset>
    </form>
  </section>;
}
