"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle } from "lucide-react";
import { saveBookDeliveryAction } from "@/app/admin/books/[bookId]/actions";
import type { BookDelivery } from "@/lib/books/delivery";

export function BookDeliveryForm({ bookId, delivery, loadError }: { bookId: string; delivery: BookDelivery | null; loadError?: string }) {
  const router = useRouter();
  const [city, setCity] = useState(delivery?.city ?? "");
  const [address, setAddress] = useState(delivery?.address ?? "");
  const [savedDelivery, setSavedDelivery] = useState(delivery);
  const [editing, setEditing] = useState(!delivery);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    const formData = new FormData();
    formData.set("bookId", bookId);
    formData.set("city", city);
    formData.set("address", address);
    try {
      const result = await saveBookDeliveryAction({}, formData);
      if (result.error || !result.delivery) { setError(result.error ?? "Не удалось сохранить доставку"); return; }
      setSavedDelivery(result.delivery);
      setCity(result.delivery.city);
      setAddress(result.delivery.address);
      setEditing(false);
      router.refresh();
    } catch {
      setError("Не удалось сохранить доставку. Попробуйте снова.");
    } finally {
      setPending(false);
    }
  }

  function cancelEditing() {
    if (!savedDelivery) return;
    setCity(savedDelivery.city);
    setAddress(savedDelivery.address);
    setError("");
    setEditing(false);
  }

  return <section className="admin-card book-delivery book-delivery-panel" aria-labelledby="book-delivery-heading">
    <header><div><h2 id="book-delivery-heading">Доставка книги</h2><p>Город и адрес доставки готового экземпляра.</p></div></header>
    {loadError && <p role="alert" className="admin-form-error">{loadError}</p>}
    {!editing && savedDelivery ? <div className="book-delivery-summary">
      <div><small>Город</small><strong>{savedDelivery.city}</strong></div><div><small>Адрес</small><strong>{savedDelivery.address}</strong></div>
      <button className="book-delivery-summary__edit" type="button" disabled={Boolean(loadError)} onClick={() => { setError(""); setEditing(true); }}>Изменить детали</button>
    </div> : <form onSubmit={(event) => void save(event)} onChange={() => setError("")}>
      <input type="hidden" name="bookId" value={bookId} />
      <fieldset disabled={pending || Boolean(loadError)}>
        <fieldset className="book-delivery-fields">
          <label htmlFor="book-delivery-city">Город<input id="book-delivery-city" name="city" value={city} onChange={event => setCity(event.target.value)} maxLength={120} required autoComplete="shipping address-level2" placeholder="Например, Алматы" /></label>
          <label htmlFor="book-delivery-address">Адрес<textarea id="book-delivery-address" name="address" value={address} onChange={event => setAddress(event.target.value)} maxLength={500} required autoComplete="shipping street-address" placeholder="Улица, дом, квартира" rows={1} /></label>
        </fieldset>
        <footer><span role={error ? "alert" : "status"}>{error}</span>{savedDelivery && <button className="book-delivery-cancel" type="button" disabled={pending} onClick={cancelEditing}>Отмена</button>}<button className="content-primary-button" type="submit" disabled={pending || Boolean(loadError)}>{pending ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}Сохранить доставку</button></footer>
      </fieldset>
    </form>}
  </section>;
}
