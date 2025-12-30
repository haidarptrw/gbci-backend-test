import { Effect } from "effect";
import { Horoscope, Zodiac } from "../effect/enums/profiles";
import { InvalidDateError } from "../errors";

// Hard-coded zodiac from provided table
const ZODIAC_TABLE = [
    { start: new Date(2023, 0, 22), end: new Date(2024, 1, 9), sign: Zodiac.Rabbit },
    { start: new Date(2022, 1, 1), end: new Date(2023, 0, 21), sign: Zodiac.Tiger },
    { start: new Date(2021, 1, 12), end: new Date(2022, 0, 31), sign: Zodiac.Ox },
    { start: new Date(2020, 0, 25), end: new Date(2021, 1, 11), sign: Zodiac.Rat },
    { start: new Date(2019, 1, 5), end: new Date(2020, 0, 24), sign: Zodiac.Boar },
    { start: new Date(2018, 1, 16), end: new Date(2019, 1, 4), sign: Zodiac.Dog },
    { start: new Date(2017, 0, 28), end: new Date(2018, 1, 15), sign: Zodiac.Rooster },
    { start: new Date(2016, 1, 8), end: new Date(2017, 0, 27), sign: Zodiac.Monkey },
    { start: new Date(2015, 1, 19), end: new Date(2016, 1, 7), sign: Zodiac.Goat },
    { start: new Date(2014, 0, 31), end: new Date(2015, 1, 18), sign: Zodiac.Horse },
    { start: new Date(2013, 1, 10), end: new Date(2014, 0, 30), sign: Zodiac.Snake },
    { start: new Date(2012, 0, 23), end: new Date(2013, 1, 9), sign: Zodiac.Dragon },
    { start: new Date(2011, 1, 3), end: new Date(2012, 0, 22), sign: Zodiac.Rabbit },
    { start: new Date(2010, 1, 14), end: new Date(2011, 1, 2), sign: Zodiac.Tiger },
    { start: new Date(2009, 0, 26), end: new Date(2010, 1, 13), sign: Zodiac.Ox },
    { start: new Date(2008, 1, 7), end: new Date(2009, 0, 25), sign: Zodiac.Rat },
    { start: new Date(2007, 1, 18), end: new Date(2008, 1, 6), sign: Zodiac.Boar },
    { start: new Date(2006, 0, 29), end: new Date(2007, 1, 17), sign: Zodiac.Dog },
    { start: new Date(2005, 1, 9), end: new Date(2006, 0, 28), sign: Zodiac.Rooster },
    { start: new Date(2004, 0, 22), end: new Date(2005, 1, 8), sign: Zodiac.Monkey },
    { start: new Date(2003, 1, 1), end: new Date(2004, 0, 21), sign: Zodiac.Goat },
    { start: new Date(2002, 1, 12), end: new Date(2003, 0, 31), sign: Zodiac.Horse },
    { start: new Date(2001, 0, 24), end: new Date(2002, 1, 11), sign: Zodiac.Snake },
    { start: new Date(2000, 1, 5), end: new Date(2001, 0, 23), sign: Zodiac.Dragon },
    { start: new Date(1999, 1, 16), end: new Date(2000, 1, 4), sign: Zodiac.Rabbit },
    { start: new Date(1998, 0, 28), end: new Date(1999, 1, 15), sign: Zodiac.Tiger },
    { start: new Date(1997, 1, 7), end: new Date(1998, 0, 27), sign: Zodiac.Ox },
    { start: new Date(1996, 1, 19), end: new Date(1997, 1, 6), sign: Zodiac.Rat },
    { start: new Date(1995, 0, 31), end: new Date(1996, 1, 18), sign: Zodiac.Boar },
    { start: new Date(1994, 1, 10), end: new Date(1995, 0, 30), sign: Zodiac.Dog },
    { start: new Date(1993, 0, 23), end: new Date(1994, 1, 9), sign: Zodiac.Rooster },
    { start: new Date(1992, 1, 4), end: new Date(1993, 0, 22), sign: Zodiac.Monkey },
    { start: new Date(1991, 1, 15), end: new Date(1992, 1, 3), sign: Zodiac.Goat },
    { start: new Date(1990, 0, 27), end: new Date(1991, 1, 14), sign: Zodiac.Horse },
    { start: new Date(1989, 1, 6), end: new Date(1990, 0, 26), sign: Zodiac.Snake },
    { start: new Date(1988, 1, 17), end: new Date(1989, 1, 5), sign: Zodiac.Dragon },
    { start: new Date(1987, 0, 29), end: new Date(1988, 1, 16), sign: Zodiac.Rabbit },
    { start: new Date(1986, 1, 9), end: new Date(1987, 0, 28), sign: Zodiac.Tiger },
    { start: new Date(1985, 1, 20), end: new Date(1986, 1, 8), sign: Zodiac.Ox },
    { start: new Date(1984, 1, 2), end: new Date(1985, 1, 19), sign: Zodiac.Rat },
    { start: new Date(1983, 1, 13), end: new Date(1984, 1, 1), sign: Zodiac.Boar },
    { start: new Date(1982, 0, 25), end: new Date(1983, 1, 12), sign: Zodiac.Dog },
    { start: new Date(1981, 1, 5), end: new Date(1982, 0, 24), sign: Zodiac.Rooster },
    { start: new Date(1980, 1, 16), end: new Date(1981, 1, 4), sign: Zodiac.Monkey },
    { start: new Date(1979, 0, 28), end: new Date(1980, 1, 15), sign: Zodiac.Goat },
    { start: new Date(1978, 1, 7), end: new Date(1979, 0, 27), sign: Zodiac.Horse },
    { start: new Date(1977, 1, 18), end: new Date(1978, 1, 6), sign: Zodiac.Snake },
    { start: new Date(1976, 0, 31), end: new Date(1977, 1, 17), sign: Zodiac.Dragon },
    { start: new Date(1975, 1, 11), end: new Date(1976, 0, 30), sign: Zodiac.Rabbit },
    { start: new Date(1974, 0, 23), end: new Date(1975, 1, 10), sign: Zodiac.Tiger },
    { start: new Date(1973, 1, 3), end: new Date(1974, 0, 22), sign: Zodiac.Ox },
    { start: new Date(1972, 0, 16), end: new Date(1973, 1, 2), sign: Zodiac.Rat },
    { start: new Date(1971, 0, 27), end: new Date(1972, 0, 15), sign: Zodiac.Boar },
    { start: new Date(1970, 1, 6), end: new Date(1971, 0, 26), sign: Zodiac.Dog },
    { start: new Date(1969, 1, 17), end: new Date(1970, 1, 5), sign: Zodiac.Rooster },
    { start: new Date(1968, 0, 30), end: new Date(1969, 1, 16), sign: Zodiac.Monkey },
    { start: new Date(1967, 1, 9), end: new Date(1968, 0, 29), sign: Zodiac.Goat },
    { start: new Date(1966, 0, 21), end: new Date(1967, 1, 8), sign: Zodiac.Horse },
    { start: new Date(1965, 1, 2), end: new Date(1966, 0, 20), sign: Zodiac.Snake },
    { start: new Date(1964, 1, 13), end: new Date(1965, 1, 1), sign: Zodiac.Dragon },
    { start: new Date(1963, 0, 25), end: new Date(1964, 1, 12), sign: Zodiac.Rabbit },
    { start: new Date(1962, 1, 5), end: new Date(1963, 0, 24), sign: Zodiac.Tiger },
    { start: new Date(1961, 1, 15), end: new Date(1962, 1, 4), sign: Zodiac.Ox },
    { start: new Date(1960, 0, 28), end: new Date(1961, 1, 14), sign: Zodiac.Rat },
    { start: new Date(1959, 1, 8), end: new Date(1960, 0, 27), sign: Zodiac.Boar },
    { start: new Date(1958, 1, 18), end: new Date(1959, 1, 7), sign: Zodiac.Dog },
    { start: new Date(1957, 0, 31), end: new Date(1958, 1, 17), sign: Zodiac.Rooster },
    { start: new Date(1956, 1, 12), end: new Date(1957, 0, 30), sign: Zodiac.Monkey },
    { start: new Date(1955, 0, 24), end: new Date(1956, 1, 11), sign: Zodiac.Goat },
    { start: new Date(1954, 1, 3), end: new Date(1955, 0, 23), sign: Zodiac.Horse },
    { start: new Date(1953, 1, 14), end: new Date(1954, 1, 2), sign: Zodiac.Snake },
    { start: new Date(1952, 0, 27), end: new Date(1953, 1, 13), sign: Zodiac.Dragon },
    { start: new Date(1951, 1, 6), end: new Date(1952, 0, 26), sign: Zodiac.Rabbit },
    { start: new Date(1950, 1, 17), end: new Date(1951, 1, 5), sign: Zodiac.Tiger },
    { start: new Date(1949, 0, 29), end: new Date(1950, 1, 16), sign: Zodiac.Ox },
    { start: new Date(1948, 1, 10), end: new Date(1949, 0, 28), sign: Zodiac.Rat },
    { start: new Date(1947, 0, 22), end: new Date(1948, 1, 9), sign: Zodiac.Boar },
    { start: new Date(1946, 1, 2), end: new Date(1947, 0, 21), sign: Zodiac.Dog },
    { start: new Date(1945, 1, 13), end: new Date(1946, 1, 1), sign: Zodiac.Rooster },
    { start: new Date(1944, 0, 25), end: new Date(1945, 1, 12), sign: Zodiac.Monkey },
    { start: new Date(1943, 1, 5), end: new Date(1944, 0, 24), sign: Zodiac.Goat },
    { start: new Date(1942, 1, 15), end: new Date(1943, 1, 4), sign: Zodiac.Horse },
    { start: new Date(1941, 0, 27), end: new Date(1942, 1, 14), sign: Zodiac.Snake },
    { start: new Date(1940, 1, 8), end: new Date(1941, 0, 26), sign: Zodiac.Dragon },
    { start: new Date(1939, 1, 19), end: new Date(1940, 1, 7), sign: Zodiac.Rabbit },
    { start: new Date(1938, 0, 31), end: new Date(1939, 1, 18), sign: Zodiac.Tiger },
    { start: new Date(1937, 1, 11), end: new Date(1938, 0, 30), sign: Zodiac.Ox },
    { start: new Date(1936, 0, 24), end: new Date(1937, 1, 10), sign: Zodiac.Rat },
    { start: new Date(1935, 1, 4), end: new Date(1936, 0, 23), sign: Zodiac.Boar },
    { start: new Date(1934, 1, 14), end: new Date(1935, 1, 3), sign: Zodiac.Dog },
    { start: new Date(1933, 0, 26), end: new Date(1934, 1, 13), sign: Zodiac.Rooster },
    { start: new Date(1932, 1, 6), end: new Date(1933, 0, 25), sign: Zodiac.Monkey },
    { start: new Date(1931, 1, 17), end: new Date(1932, 1, 5), sign: Zodiac.Goat },
    { start: new Date(1930, 0, 30), end: new Date(1931, 1, 16), sign: Zodiac.Horse },
    { start: new Date(1929, 1, 10), end: new Date(1930, 0, 29), sign: Zodiac.Snake },
    { start: new Date(1928, 0, 23), end: new Date(1929, 1, 9), sign: Zodiac.Dragon },
    { start: new Date(1927, 1, 2), end: new Date(1928, 0, 22), sign: Zodiac.Rabbit },
    { start: new Date(1926, 1, 13), end: new Date(1927, 1, 1), sign: Zodiac.Tiger },
    { start: new Date(1925, 0, 25), end: new Date(1926, 1, 12), sign: Zodiac.Ox },
    { start: new Date(1924, 1, 5), end: new Date(1925, 0, 24), sign: Zodiac.Rat },
    { start: new Date(1923, 1, 16), end: new Date(1924, 1, 4), sign: Zodiac.Boar },
    { start: new Date(1922, 0, 28), end: new Date(1923, 1, 15), sign: Zodiac.Dog },
    { start: new Date(1921, 1, 8), end: new Date(1922, 0, 27), sign: Zodiac.Rooster },
    { start: new Date(1920, 1, 20), end: new Date(1921, 1, 7), sign: Zodiac.Monkey },
    { start: new Date(1919, 1, 1), end: new Date(1920, 1, 19), sign: Zodiac.Goat },
    { start: new Date(1918, 1, 11), end: new Date(1919, 0, 31), sign: Zodiac.Horse },
    { start: new Date(1917, 0, 23), end: new Date(1918, 1, 10), sign: Zodiac.Snake },
    { start: new Date(1916, 1, 3), end: new Date(1917, 0, 22), sign: Zodiac.Dragon },
    { start: new Date(1915, 1, 14), end: new Date(1916, 1, 2), sign: Zodiac.Rabbit },
    { start: new Date(1914, 0, 26), end: new Date(1915, 1, 13), sign: Zodiac.Tiger },
    { start: new Date(1913, 1, 6), end: new Date(1914, 0, 25), sign: Zodiac.Ox },
    { start: new Date(1912, 1, 18), end: new Date(1913, 1, 5), sign: Zodiac.Rat }
];

export function mapDateToHoroscope(date: Date): Effect.Effect<Horoscope, InvalidDateError> {
    return Effect.try({
        try: () => {
            if (isNaN(date.getTime())) {
                throw new Error("Invalid date provided");
            }

            const month = date.getMonth() + 1;
            const day = date.getDate();

            if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return Horoscope.Aries();
            if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return Horoscope.Taurus();
            if ((month === 5 && day >= 21) || (month === 6 && day <= 21)) return Horoscope.Gemini();
            if ((month === 6 && day >= 22) || (month === 7 && day <= 22)) return Horoscope.Cancer();
            if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return Horoscope.Leo();
            if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return Horoscope.Virgo();
            if ((month === 9 && day >= 23) || (month === 10 && day <= 23)) return Horoscope.Libra();
            if ((month === 10 && day >= 24) || (month === 11 && day <= 21)) return Horoscope.Scorpio();
            if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return Horoscope.Sagittarius();
            if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return Horoscope.Capricorn();
            if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return Horoscope.Aquarius();
            
            return Horoscope.Pisces();
        },
        catch: (e) => new InvalidDateError({ message: (e as Error).message })
    });
}

export function mapDateToZodiac(date: Date): Effect.Effect<Zodiac, InvalidDateError> {
    return Effect.try({
        try: () => {
            if (isNaN(date.getTime())) {
                throw new Error("Invalid date provided");
            }

            // handle hard-coded following the provider calculation
            const timestamp = date.getTime();
            for (const entry of ZODIAC_TABLE) {
                if (timestamp >= entry.start.getTime() && timestamp <= entry.end.getTime()) {
                    return entry.sign(); 
                }
            }

            // FALLBACK: Handles the unhandled cases from the hardcoded table
            const year = date.getFullYear();            
            const offset = Math.abs(year - 4) % 12;
            switch (offset) {
                case 0: return Zodiac.Rat();
                case 1: return Zodiac.Ox();
                case 2: return Zodiac.Tiger();
                case 3: return Zodiac.Rabbit();
                case 4: return Zodiac.Dragon();
                case 5: return Zodiac.Snake();
                case 6: return Zodiac.Horse();
                case 7: return Zodiac.Goat();
                case 8: return Zodiac.Monkey();
                case 9: return Zodiac.Rooster();
                case 10: return Zodiac.Dog();
                case 11: return Zodiac.Boar();
                default: throw new Error("Zodiac calculation failed");
            }
        },
        catch: (e) => new InvalidDateError({ message: (e as Error).message })
    });
}