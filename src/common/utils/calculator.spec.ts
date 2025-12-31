import { Effect, Exit } from 'effect';
import { mapDateToHoroscope, mapDateToZodiac } from './calculator';
import { Horoscope, Zodiac } from '../effect/enums/profiles';

describe('Calculator Utils', () => {
  describe('mapDateToHoroscope', () => {
    // Helper to run the effect and get value
    const getHoroscope = (dateStr: string) => {
      const date = new Date(dateStr);
      const program = mapDateToHoroscope(date);
      const exit = Effect.runSyncExit(program);
      if (Exit.isFailure(exit)) throw exit.cause;
      return exit.value;
    };

    it('should correctly identify Aries (Mar 21 - Apr 19)', () => {
      expect(getHoroscope('1990-03-21')).toEqual(Horoscope.Aries());
      expect(getHoroscope('1990-04-19')).toEqual(Horoscope.Aries());
    });

    it('should correctly identify Virgo (Aug 23 - Sep 22)', () => {
      expect(getHoroscope('1990-08-23')).toEqual(Horoscope.Virgo());
      expect(getHoroscope('1990-09-22')).toEqual(Horoscope.Virgo());
    });

    it('should correctly identify Capricorn (Dec 22 - Jan 19)', () => {
      expect(getHoroscope('1990-12-22')).toEqual(Horoscope.Capricorn());
      expect(getHoroscope('1991-01-19')).toEqual(Horoscope.Capricorn());
    });

    it('should fail for invalid dates', () => {
      const program = mapDateToHoroscope(new Date('invalid-date'));
      const exit = Effect.runSyncExit(program);
      expect(Exit.isFailure(exit)).toBe(true);
    });
  });

  describe('mapDateToZodiac', () => {
    const getZodiac = (dateStr: string) => {
      const date = new Date(dateStr);
      const program = mapDateToZodiac(date);
      const exit = Effect.runSyncExit(program);
      if (Exit.isFailure(exit)) throw exit.cause;
      return exit.value;
    };

    it('should match Zodiac from the Hardcoded Table (1990)', () => {
      expect(getZodiac('1990-09-10')).toEqual(Zodiac.Horse());
    });

    it('should match Zodiac from the Hardcoded Table (2023 - Rabbit)', () => {
      expect(getZodiac('2023-05-01')).toEqual(Zodiac.Rabbit());
    });

    it('should use Fallback Logic for future dates (Post-2024)', () => {
      // 2026 is Year of the Horse (2014 + 12)
      // The table stops at 2024
      // This tests the switch-case fallback logic
      expect(getZodiac('2026-06-01')).toEqual(Zodiac.Horse());
    });

    it('should use Fallback Logic for very old dates (Pre-1912)', () => {
      expect(getZodiac('1900-05-01')).toEqual(Zodiac.Rat());
    });
  });
});
