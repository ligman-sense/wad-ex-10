const mongoose = require('mongoose');
const currentYear = new Date().getFullYear();

const studentSchema = new mongoose.Schema({
  rollno: { type: Number, required: [true, 'Roll number is required.'], unique: true, min: [1, 'Roll number must be positive.'] },
  name: { type: String, required: [true, 'Student name is required.'], trim: true, maxlength: [100, 'Name must be 100 characters or fewer.'] },
  yearOfBirth: { type: Number, required: [true, 'Year of birth is required.'], min: [1900, 'Invalid year of birth.'], max: [currentYear, 'Year of birth cannot be in the future.'] },
  yearOfAdmission: { type: Number, required: [true, 'Year of admission is required.'], min: [1900, 'Invalid year of admission.'], max: [currentYear, 'Admission year cannot be in the future.'] },
  nativeCity: { type: String, required: [true, 'Native city is required.'], trim: true, maxlength: [80, 'City must be 80 characters or fewer.'] },
  phoneNumber: { type: String, required: [true, 'Student phone number is required.'], match: [/^[0-9]{10}$/, 'Enter a valid 10-digit phone number.'] },
  guardianPhoneNumber: { type: String, trim: true, default: undefined, match: [/^[0-9]{10}$/, 'Enter a valid 10-digit guardian phone number.'] },
  gender: { type: String, enum: { values: ['Male', 'Female', 'Other'], message: 'Select Male, Female, or Other.' }, required: [true, 'Select a gender.'] }
}, { timestamps: true });

studentSchema.pre('validate', function validateAdmissionYear(next) {
  if (this.yearOfAdmission && this.yearOfBirth && this.yearOfAdmission < this.yearOfBirth) {
    this.invalidate('yearOfAdmission', 'Admission year cannot be earlier than year of birth.');
  }
  next();
});

module.exports = mongoose.model('Student', studentSchema);

