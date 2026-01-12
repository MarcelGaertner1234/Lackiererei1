/**
 * Unit Tests for validation.js
 * Session #15 (2026-01-12)
 *
 * Tests für Form Validation Utility Funktionen
 */

const {
    validateEmail,
    validatePhone,
    validateKennzeichen,
    validateFIN,
    validatePLZ,
    validateRequired,
    validateDate,
    validateNumber,
    validateForm
} = require('../../js/utils/validation');

describe('validation.js', () => {
    // ================================================================
    // validateEmail()
    // ================================================================

    describe('validateEmail()', () => {
        describe('Valid emails', () => {
            test('accepts simple email', () => {
                const result = validateEmail('test@example.com');
                expect(result.valid).toBe(true);
                expect(result.error).toBeNull();
            });

            test('accepts email with subdomain', () => {
                expect(validateEmail('user@mail.example.com').valid).toBe(true);
            });

            test('accepts email with plus sign', () => {
                expect(validateEmail('user+tag@example.com').valid).toBe(true);
            });

            test('accepts email with dots', () => {
                expect(validateEmail('user.name@example.com').valid).toBe(true);
            });

            test('accepts German domain', () => {
                expect(validateEmail('test@example.de').valid).toBe(true);
            });
        });

        describe('Invalid emails', () => {
            test('rejects email without @', () => {
                const result = validateEmail('invalid');
                expect(result.valid).toBe(false);
                expect(result.error).toBe('Ungültige E-Mail-Adresse');
            });

            test('rejects email without domain', () => {
                expect(validateEmail('user@').valid).toBe(false);
            });

            test('rejects email without local part', () => {
                expect(validateEmail('@domain.com').valid).toBe(false);
            });

            test('rejects email with spaces', () => {
                expect(validateEmail('user @example.com').valid).toBe(false);
            });
        });

        describe('Empty/null handling', () => {
            test('rejects empty string', () => {
                const result = validateEmail('');
                expect(result.valid).toBe(false);
                expect(result.error).toBe('E-Mail-Adresse ist erforderlich');
            });

            test('rejects null', () => {
                expect(validateEmail(null).valid).toBe(false);
            });

            test('rejects undefined', () => {
                expect(validateEmail(undefined).valid).toBe(false);
            });

            test('rejects whitespace only', () => {
                expect(validateEmail('   ').valid).toBe(false);
            });
        });
    });

    // ================================================================
    // validatePhone()
    // ================================================================

    describe('validatePhone()', () => {
        describe('Valid German phone numbers', () => {
            test('accepts standard format', () => {
                const result = validatePhone('0621-1234567');
                expect(result.valid).toBe(true);
            });

            test('accepts mobile number', () => {
                expect(validatePhone('0171-1234567').valid).toBe(true);
            });

            test('accepts +49 format', () => {
                expect(validatePhone('+49621-1234567').valid).toBe(true);
            });

            test('accepts number with spaces', () => {
                expect(validatePhone('0621 123 4567').valid).toBe(true);
            });

            test('accepts number with parentheses', () => {
                expect(validatePhone('(0621) 1234567').valid).toBe(true);
            });

            test('returns formatted number', () => {
                const result = validatePhone('06211234567');
                expect(result.formatted).toBeDefined();
            });
        });

        describe('Invalid phone numbers', () => {
            test('rejects too short number', () => {
                // '062' is only 3 chars: 0 + 6 + 2 (needs at least 0 + [1-9] + [0-9]{1,14})
                // But '0621' (4 chars) is valid: 0 + 6 + 21
                expect(validatePhone('06').valid).toBe(false);
            });

            test('rejects letters', () => {
                expect(validatePhone('0621-ABC').valid).toBe(false);
            });

            test('rejects number starting with wrong digit', () => {
                expect(validatePhone('1234567890').valid).toBe(false);
            });
        });

        describe('Empty/null handling', () => {
            test('rejects empty string', () => {
                const result = validatePhone('');
                expect(result.valid).toBe(false);
                expect(result.error).toBe('Telefonnummer ist erforderlich');
            });

            test('rejects null', () => {
                expect(validatePhone(null).valid).toBe(false);
            });
        });
    });

    // ================================================================
    // validateKennzeichen()
    // ================================================================

    describe('validateKennzeichen()', () => {
        describe('Valid German license plates', () => {
            test('accepts standard format MOS-AB 123', () => {
                const result = validateKennzeichen('MOS-AB 123');
                expect(result.valid).toBe(true);
            });

            test('accepts HD-XY 9999', () => {
                expect(validateKennzeichen('HD-XY 9999').valid).toBe(true);
            });

            test('accepts single letter city B-A 1', () => {
                expect(validateKennzeichen('B-A 1').valid).toBe(true);
            });

            test('accepts without spaces', () => {
                expect(validateKennzeichen('MOSAB123').valid).toBe(true);
            });

            test('accepts lowercase (converts to upper)', () => {
                expect(validateKennzeichen('mos-ab 123').valid).toBe(true);
            });
        });

        describe('Special plates', () => {
            test('accepts electric vehicle (E suffix)', () => {
                expect(validateKennzeichen('MOS-AB 123E').valid).toBe(true);
            });

            test('accepts historical vehicle (H suffix)', () => {
                expect(validateKennzeichen('MOS-AB 123H').valid).toBe(true);
            });
        });

        describe('Invalid plates', () => {
            test('rejects plates starting with 0', () => {
                expect(validateKennzeichen('MOS-AB 0123').valid).toBe(false);
            });

            test('rejects too many digits', () => {
                expect(validateKennzeichen('MOS-AB 12345').valid).toBe(false);
            });

            test('rejects only numbers', () => {
                expect(validateKennzeichen('12345').valid).toBe(false);
            });
        });

        describe('Empty/null handling', () => {
            test('rejects empty string', () => {
                const result = validateKennzeichen('');
                expect(result.valid).toBe(false);
                expect(result.error).toBe('Kennzeichen ist erforderlich');
            });
        });

        describe('Formatted output', () => {
            test('returns formatted plate', () => {
                const result = validateKennzeichen('mosab123');
                expect(result.formatted).toBeDefined();
            });
        });
    });

    // ================================================================
    // validateFIN()
    // ================================================================

    describe('validateFIN()', () => {
        describe('Valid VINs', () => {
            test('accepts valid 17-char VIN', () => {
                const result = validateFIN('WVWZZZ3CZWE123456');
                expect(result.valid).toBe(true);
            });

            test('accepts VIN with numbers and letters', () => {
                expect(validateFIN('1HGBH41JXMN109186').valid).toBe(true);
            });

            test('accepts lowercase (converts to upper)', () => {
                expect(validateFIN('wvwzzz3czwe123456').valid).toBe(true);
            });
        });

        describe('Invalid VINs', () => {
            test('rejects VIN with I (looks like 1)', () => {
                expect(validateFIN('WVWZZZ3CZWE12345I').valid).toBe(false);
            });

            test('rejects VIN with O (looks like 0)', () => {
                expect(validateFIN('WVWZZZ3CZWE12345O').valid).toBe(false);
            });

            test('rejects VIN with Q', () => {
                expect(validateFIN('WVWZZZ3CZWE12345Q').valid).toBe(false);
            });

            test('rejects too short VIN', () => {
                const result = validateFIN('WVWZZZ3C');
                expect(result.valid).toBe(false);
                expect(result.error).toBe('FIN muss genau 17 Zeichen haben');
            });

            test('rejects too long VIN', () => {
                expect(validateFIN('WVWZZZ3CZWE123456789').valid).toBe(false);
            });
        });

        describe('Empty/null handling', () => {
            test('rejects empty string', () => {
                const result = validateFIN('');
                expect(result.valid).toBe(false);
                expect(result.error).toBe('Fahrzeugidentifikationsnummer (FIN) ist erforderlich');
            });
        });
    });

    // ================================================================
    // validatePLZ()
    // ================================================================

    describe('validatePLZ()', () => {
        describe('Valid German postal codes', () => {
            test('accepts 5-digit PLZ', () => {
                expect(validatePLZ('74821').valid).toBe(true);
            });

            test('accepts PLZ starting with 0', () => {
                expect(validatePLZ('01234').valid).toBe(true);
            });
        });

        describe('Invalid postal codes', () => {
            test('rejects 4-digit PLZ', () => {
                expect(validatePLZ('7482').valid).toBe(false);
            });

            test('rejects 6-digit PLZ', () => {
                expect(validatePLZ('748210').valid).toBe(false);
            });

            test('rejects PLZ with letters', () => {
                expect(validatePLZ('7482A').valid).toBe(false);
            });
        });

        describe('Empty/null handling', () => {
            test('rejects empty string', () => {
                const result = validatePLZ('');
                expect(result.valid).toBe(false);
                expect(result.error).toBe('Postleitzahl ist erforderlich');
            });
        });
    });

    // ================================================================
    // validateRequired()
    // ================================================================

    describe('validateRequired()', () => {
        test('accepts non-empty string', () => {
            expect(validateRequired('test').valid).toBe(true);
        });

        test('accepts number', () => {
            expect(validateRequired(123).valid).toBe(true);
        });

        test('rejects empty string', () => {
            const result = validateRequired('', 'Name');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Name ist erforderlich');
        });

        test('rejects null', () => {
            expect(validateRequired(null).valid).toBe(false);
        });

        test('rejects whitespace only', () => {
            expect(validateRequired('   ').valid).toBe(false);
        });
    });

    // ================================================================
    // validateDate()
    // ================================================================

    describe('validateDate()', () => {
        describe('Valid dates', () => {
            test('accepts YYYY-MM-DD format', () => {
                const result = validateDate('2025-11-08');
                expect(result.valid).toBe(true);
                expect(result.date).toBeInstanceOf(Date);
            });

            test('returns correct Date object', () => {
                const result = validateDate('2025-12-25');
                expect(result.date.getFullYear()).toBe(2025);
                expect(result.date.getMonth()).toBe(11); // 0-indexed
                expect(result.date.getDate()).toBe(25);
            });
        });

        describe('Invalid dates', () => {
            test('rejects DD.MM.YYYY format', () => {
                expect(validateDate('08.11.2025').valid).toBe(false);
            });

            test('rejects invalid date (Feb 30)', () => {
                expect(validateDate('2025-02-30').valid).toBe(false);
            });

            test('rejects invalid month', () => {
                expect(validateDate('2025-13-01').valid).toBe(false);
            });
        });

        describe('Empty/null handling', () => {
            test('rejects empty string', () => {
                const result = validateDate('');
                expect(result.valid).toBe(false);
                expect(result.error).toBe('Datum ist erforderlich');
            });
        });
    });

    // ================================================================
    // validateNumber()
    // ================================================================

    describe('validateNumber()', () => {
        describe('Valid numbers', () => {
            test('accepts integer', () => {
                const result = validateNumber(42);
                expect(result.valid).toBe(true);
                expect(result.number).toBe(42);
            });

            test('accepts decimal', () => {
                const result = validateNumber(3.14);
                expect(result.valid).toBe(true);
                expect(result.number).toBe(3.14);
            });

            test('accepts string number', () => {
                expect(validateNumber('123').number).toBe(123);
            });

            test('accepts negative number', () => {
                expect(validateNumber(-10).number).toBe(-10);
            });
        });

        describe('Range validation', () => {
            test('accepts number within range', () => {
                expect(validateNumber(5, { min: 0, max: 10 }).valid).toBe(true);
            });

            test('rejects number below min', () => {
                const result = validateNumber(-1, { min: 0 });
                expect(result.valid).toBe(false);
                expect(result.error).toContain('mindestens');
            });

            test('rejects number above max', () => {
                const result = validateNumber(11, { max: 10 });
                expect(result.valid).toBe(false);
                expect(result.error).toContain('maximal');
            });
        });

        describe('Integer validation', () => {
            test('accepts integer when required', () => {
                expect(validateNumber(42, { integer: true }).valid).toBe(true);
            });

            test('rejects decimal when integer required', () => {
                const result = validateNumber(3.14, { integer: true });
                expect(result.valid).toBe(false);
                expect(result.error).toBe('Ganzzahl erforderlich');
            });
        });

        describe('Invalid input', () => {
            test('rejects NaN', () => {
                expect(validateNumber('abc').valid).toBe(false);
            });

            test('rejects empty string', () => {
                expect(validateNumber('').valid).toBe(false);
            });

            test('rejects null', () => {
                expect(validateNumber(null).valid).toBe(false);
            });
        });
    });

    // ================================================================
    // validateForm()
    // ================================================================

    describe('validateForm()', () => {
        test('validates all fields', () => {
            const formData = {
                email: 'test@example.com',
                phone: '0621-1234567'
            };
            const rules = {
                email: { validator: validateEmail },
                phone: { validator: validatePhone }
            };

            const result = validateForm(formData, rules);
            expect(result.valid).toBe(true);
            expect(Object.keys(result.errors)).toHaveLength(0);
        });

        test('returns errors for invalid fields', () => {
            const formData = {
                email: 'invalid',
                phone: '123'
            };
            const rules = {
                email: { validator: validateEmail },
                phone: { validator: validatePhone }
            };

            const result = validateForm(formData, rules);
            expect(result.valid).toBe(false);
            expect(result.errors.email).toBeDefined();
            expect(result.errors.phone).toBeDefined();
        });

        test('validates only specified fields', () => {
            const formData = {
                email: 'test@example.com',
                extra: 'ignored'
            };
            const rules = {
                email: { validator: validateEmail }
            };

            const result = validateForm(formData, rules);
            expect(result.valid).toBe(true);
        });
    });
});
