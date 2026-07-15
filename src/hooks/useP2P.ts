import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { haptic } from '../lib/utils';
import { toastSuccess, toastError } from '../lib/toast';

export interface P2POfferData {
  id: string; user_id: string; user_name: string;
  type: 'buy' | 'sell'; coin: string; fiat: 'RUB';
  price: number; min_amount: number; max_amount: number;
  available: number; payment_method: string;
  status: 'active' | 'completed' | 'cancelled'; created_at: string;
}

export function useP2P() {
  const [offers, setOffers] = useState<P2POfferData[]>([]);
  const [myOffers, setMyOffers] = useState<P2POfferData[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchOffers = useCallback(async (type: 'buy' | 'sell') => {
    setLoading(true);
    try {
      const { data } = await supabase.from('p2p_offers').select('*').eq('status', 'active').eq('type', type).order('price', { ascending: type === 'buy' ? false : true }).limit(30);
      if (data) setOffers(data as P2POfferData[]);
    } catch {}
    setLoading(false);
  }, []);

  const fetchMyOffers = useCallback(async () => {
    const { data } = await supabase.from('p2p_offers').select('*').order('created_at', { ascending: false });
    if (data) setMyOffers(data as P2POfferData[]);
  }, []);

  const createOffer = useCallback(async (o: { type: 'buy' | 'sell'; coin: string; price: number; amount: number; min_amount: number; max_amount: number; payment_method: string }) => {
    setCreating(true);
    const { data, error } = await supabase.from('p2p_offers').insert({
      user_id: 'user', user_name: 'User', type: o.type, coin: o.coin, fiat: 'RUB',
      price: o.price, min_amount: o.min_amount, max_amount: o.max_amount,
      available: o.amount, payment_method: o.payment_method, status: 'active',
    }).select().single();
    if (error) { toastError('Error', error.message); setCreating(false); return null; }
    toastSuccess('Offer created!'); haptic('success');
    await fetchMyOffers(); setCreating(false);
    return data;
  }, [fetchMyOffers]);

  const deleteOffer = useCallback(async (id: string) => {
    await supabase.from('p2p_offers').update({ status: 'cancelled' }).eq('id', id);
    toastSuccess('Offer deleted'); await fetchMyOffers();
  }, [fetchMyOffers]);

  const startTrade = useCallback(async (offer: P2POfferData, amount: number) => {
    haptic('medium'); await new Promise(r => setTimeout(r, 2000));
    toastSuccess('Trade started!', `${amount} ${offer.coin}`); haptic('success');
    return true;
  }, []);

  return { offers, myOffers, loading, creating, fetchOffers, fetchMyOffers, createOffer, deleteOffer, startTrade };
}