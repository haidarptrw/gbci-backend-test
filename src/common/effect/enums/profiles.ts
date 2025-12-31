import { Data } from "effect";

export type Gender = Data.TaggedEnum<{
    Male: {},
    Female: {},
}>

export const Gender = Data.taggedEnum<Gender>();

export type Horoscope = Data.TaggedEnum<{
  Aries: {};
  Taurus: {};
  Gemini: {};
  Cancer: {};
  Leo: {};
  Virgo: {};
  Libra: {};
  Scorpio: {};
  Sagittarius: {};
  Capricorn: {};
  Aquarius: {};
  Pisces: {};
}>;

export const Horoscope = Data.taggedEnum<Horoscope>();

export type Zodiac = Data.TaggedEnum<{
  Rat: {};
  Ox: {};
  Tiger: {};
  Rabbit: {};
  Dragon: {};
  Snake: {};
  Horse: {};
  Goat: {};
  Monkey: {};
  Rooster: {};
  Dog: {};
  Boar: {};
}>;

export const Zodiac = Data.taggedEnum<Zodiac>();