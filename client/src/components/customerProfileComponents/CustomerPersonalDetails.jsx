import { useState, useRef, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import { useAuth } from '../../utils/AuthContext';

const CustomerPersonalDetails = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    dateOfBirth: '',
    gender: '',
  });

  const [originalData, setOriginalData] = useState({ ...formData });

  // Load profile data on component mount
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        setIsLoading(true);
        const response = await axiosInstance.get('/customer/profile/data', { params: { id: user.id } });
        const profileData = response.data;

        // Handle dateOfBirth: Assume server sends it in YYYY-MM-DD format or parse it accordingly
        if (profileData.dateOfBirth) {
          // If the server sends a date like '2025-09-27T00:00:00Z', extract just the date part
          const dob = new Date(profileData.dateOfBirth);
          profileData.dateOfBirth = `${dob.getFullYear()}-${String(dob.getMonth() + 1).padStart(2, '0')}-${String(dob.getDate()).padStart(2, '0')}`;
        }

        setFormData(profileData);
        setOriginalData(profileData);

        if (profileData.profileImageUrl) {
          setProfileImage(profileData.profileImageUrl);
        }
      } catch (err) {
        console.error('Error loading profile data:', err);
        setError('Failed to load profile data. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfileData();
  }, [user.id]);

  const handleInputChange = (field, value) => {
    if (field === 'firstName' || field === 'lastName') {
      const nameRegex = /^[A-Za-z\s]*$/;
      if (nameRegex.test(value)) {
        setFormData((prev) => ({ ...prev, [field]: value }));
      }
    } else if (field === 'phone') {
      if (!/^[0-9]*$/.test(value) || value.length > 10 || (value.length > 0 && !value.startsWith('0'))) {
        return;
      }
      setFormData((prev) => ({ ...prev, [field]: value }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      setIsUploading(true);
      setError(null);
      try {
        const formDataImage = new FormData();
        formDataImage.append('profileImage', file);
        const response = await axiosInstance.post('/customer/profile/image', formDataImage, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const imageUrl = response.data.imageUrl || URL.createObjectURL(file);
        setProfileImage(imageUrl);
        setSuccessMessage('Profile image updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (err) {
        console.error('Error uploading image:', err);
        setError('Failed to upload image. Please try again.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleEdit = () => {
    setOriginalData({ ...formData });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData({ ...originalData });
    setIsEditing(false);
    setError(null);
    setSuccessMessage('');
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.phone.trim()) {
        setError('Please fill in all required fields (First Name, Last Name, Phone)');
        return;
      }

      // Send dateOfBirth as a YYYY-MM-DD string
      const dataToSend = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        dateOfBirth: formData.dateOfBirth || null, // Send as is (YYYY-MM-DD) or null if not set
        gender: formData.gender,
      };

      const response = await axiosInstance.put('/customer/profile/data', dataToSend);
      const updatedData = response.data.user;

      // Handle returned dateOfBirth
      if (updatedData.dateOfBirth) {
        const dob = new Date(updatedData.dateOfBirth);
        updatedData.dateOfBirth = `${dob.getFullYear()}-${String(dob.getMonth() + 1).padStart(2, '0')}-${String(dob.getDate()).padStart(2, '0')}`;
      }

      setOriginalData(updatedData);
      setFormData(updatedData);
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(
        err.response?.status === 400
          ? err.response.data.message || 'Invalid data provided. Please check your inputs.'
          : err.response?.status === 401
          ? 'Session expired. Please log in again.'
          : err.response?.status === 500
          ? 'Server error. Please try again later.'
          : 'Failed to update profile. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const today = new Date().toISOString().split('T')[0];

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-6 bg-white dark:bg-gray-900 min-h-screen transition-colors duration-300">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 dark:bg-gray-900 min-h-screen transition-colors duration-300">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Personal Details</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your personal information and preferences</p>
      </div>

      {/* Error & Success Alerts */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-700 dark:text-red-400 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      {successMessage && (
        <div className="mb-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-emerald-700 dark:text-emerald-400">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
              <div className="relative">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover" />
                ) : (
                  <div className="w-20 h-20 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                    <span className="text-emerald-600 font-bold text-xl">{getInitials(formData.firstName, formData.lastName)}</span>
                  </div>
                )}
          
               
              </div>
              <div className="text-white text-center sm:text-left space-y-1">
                <h2 className="text-xl sm:text-2xl font-bold">{formData.firstName} {formData.lastName}</h2>
                <p className="text-emerald-100 text-base">{formData.role}</p>
                <p className="text-emerald-100 text-sm break-all">{formData.email}</p>
              </div>
            </div>
            <div className="flex-shrink-0">
              {!isEditing ? (
                <button onClick={handleEdit} className="bg-white text-emerald-600 px-4 py-2 rounded-lg font-medium hover:bg-emerald-50 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={handleCancel} className="bg-white/10 text-white px-4 py-2 rounded-lg font-medium hover:bg-white/20 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={isSaving} className="bg-white text-emerald-600 px-4 py-2 rounded-lg font-medium hover:bg-emerald-50 transition-colors flex items-center gap-2 disabled:opacity-50">
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-4 sm:p-6">
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
              Personal Information
            </h3>

            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">First Name *</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="block text-sm w-full px-4 py-2.5 mt-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-0"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-gray-100 py-2">{formData.firstName || 'Not set'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Last Name *</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="block text-sm w-full px-4 py-2.5 mt-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-0"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-gray-100 py-2">{formData.lastName || 'Not set'}</p>
                )}
              </div>
            </div>

            {/* Read-only fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
              <div className="flex items-center gap-2">
                <p className="text-gray-500 dark:text-gray-400 py-2 flex-1 break-all">{formData.email}</p>
                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded whitespace-nowrap">Read-only</span>
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Number *</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="block text-sm w-full px-4 py-2.5 mt-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-0"
                />
              ) : (
                <p className="text-gray-900 dark:text-gray-100 py-2">{formData.phone || 'Not set'}</p>
              )}
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
              <div className="flex items-center gap-2">
                <p className="text-gray-500 dark:text-gray-400 py-2 flex-1">{formData.role}</p>
                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded whitespace-nowrap">Read-only</span>
              </div>
            </div>

            {/* DOB and Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date of Birth</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={formData.dateOfBirth || ''}
                    max={today}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    className="block text-sm w-full px-4 py-2.5 mt-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-0"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-gray-100 py-2">
                    {formData.dateOfBirth
                      ? new Date(formData.dateOfBirth).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'Not set'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gender</label>
                {isEditing ? (
                  <select
                    value={formData.gender || 'Prefer not to say'}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className="block text-sm w-full px-4 py-2.5 mt-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-0"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                ) : (
                  <p className="text-gray-900 dark:text-gray-100 py-2">{formData.gender || 'Not set'}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerPersonalDetails;