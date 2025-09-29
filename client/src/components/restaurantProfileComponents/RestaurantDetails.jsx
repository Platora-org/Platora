import { useState, useRef, useEffect } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import { useAuth } from "../../utils/AuthContext";

const RestaurantDetails = () => {
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
        restaurantName: '',
        cuisineType: ''
    });

    const [originalData, setOriginalData] = useState({ ...formData });

    // ⭐ 1. FIX IS APPLIED HERE
    useEffect(() => {
        const loadProfileData = async () => {
            try {
                setIsLoading(true);
                const response = await axiosInstance.get('api/restaurant/profile/data', { params: { id: user.id } });
                const profileData = response.data;

                // Sanitize the data: replace any null values with empty strings
                const sanitizedData = {
                    firstName: profileData.firstName || '',
                    lastName: profileData.lastName || '',
                    email: profileData.email || '',
                    phone: profileData.phone || '',
                    role: profileData.role || '',
                    restaurantName: profileData.restaurantName || '',
                    cuisineType: profileData.cuisineType || '',
                };

                

                setFormData(sanitizedData);
                setOriginalData(sanitizedData);

                if (profileData.profileImageUrl) {
                    setProfileImage(profileData.profileImageUrl);
                    console.log( "===========================================",profileData.profileImageUrl, "===========================================")
                }
            } catch (err) {
                console.error('Error loading profile data:', err);
                setError('Failed to load profile data. Please refresh the page.');
            } finally {
                setIsLoading(false);
            }
        };

        if (user?.id) {
            loadProfileData();
        }
    }, [user.id]);

    const handleInputChange = (field, value) => {
        if (field === 'firstName' || field === 'lastName') {
            const nameRegex = /^[A-Za-z\s]*$/;
            if (nameRegex.test(value)) {
                setFormData(prev => ({ ...prev, [field]: value }));         
            }
        } else if (field === 'phone') {
            if (/^[0-9]*$/.test(value) && value.length <= 10 && (value.length === 0 || value.startsWith('0'))) {
                 if (value.length > 1 && !value.startsWith('07')) return;
                 setFormData(prev => ({ ...prev, [field]: value }));
            }
        } else if (field === 'cuisineType') {
            const nameRegex = /^[A-Za-z\s]*$/;
            if (nameRegex.test(value)) {
                setFormData(prev => ({ ...prev, [field]: value }));         
            }
        }else if (field === 'restaurantName') {
            const nameRegex = /^[A-Za-z\s]*$/;
            if (nameRegex.test(value)) {
                setFormData(prev => ({ ...prev, [field]: value }));         
            }
        }
        else {
            setFormData(prev => ({ ...prev, [field]: value }));
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
                const response = await axiosInstance.post('api/restaurant/profile/image', formDataImage, {
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
    
    // ⭐ 2. FIX IS APPLIED HERE
    const handleSave = async () => {
        try {
            setIsSaving(true);
            setError(null);

            // The .trim() calls are now safe because formData values are guaranteed to be strings
            if (!formData.restaurantName.trim() || !formData.firstName.trim() || !formData.lastName.trim() || !formData.phone.trim()) {
                setError('Please fill in all required fields (Restaurant Name, First Name, Last Name, Phone)');
                setIsSaving(false); // Stop saving
                return;
            }
            const phoneRegex = /^07[0-9]{8}$/;
            if (!phoneRegex.test(formData.phone.trim())) {
                setError('Please enter a valid 10-digit phone number starting with 07.');
                setIsSaving(false); // Stop saving
                return;
            }

            const dataToSend = {
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                phone: formData.phone.trim(),
                restaurantName: formData.restaurantName.trim(),
                cuisineType: formData.cuisineType.trim(),
            };

            const response = await axiosInstance.put('api/restaurant/profile/data', dataToSend);
            
            const updatedData = response.data.user;
            
            // Sanitize the returned data as well before setting state
            const sanitizedUpdatedData = {
                firstName: updatedData.firstName || '',
                lastName: updatedData.lastName || '',
                email: updatedData.email || '',
                phone: updatedData.phone || '',
                role: updatedData.role || '',
                restaurantName: updatedData.restaurantName || '',
                cuisineType: updatedData.cuisineType || '',
            };

            setOriginalData(sanitizedUpdatedData);
            setFormData(sanitizedUpdatedData);
            
            setIsEditing(false);
            setSuccessMessage('Profile updated successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error updating profile:', err);
            setError(err.response?.data?.message || 'Failed to update profile. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const getInitials = (name) => {
        if (!name) return '';
        const words = name.split(' ');
        if (words.length > 1) {
            return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };
    
    const handleEdit = () => { setIsEditing(true); setOriginalData({ ...formData }); };
    const handleCancel = () => { setIsEditing(false); setFormData({ ...originalData }); setError(null); };

    if (isLoading) {
        return (
            <div className="max-w-3xl mx-auto p-4 sm:p-6 bg-white dark:bg-gray-900 min-h-screen">
                <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-3 text-gray-600 dark:text-gray-400">Loading Profile...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-4 sm:p-6 dark:bg-gray-900 min-h-screen transition-colors duration-300">
            <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Profile Details</h1>
                <p className="text-gray-600 dark:text-gray-400">Manage your restaurant and owner information</p>
            </div>

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

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                            <div className="relative">
                                {profileImage ? (
                                    <img src={profileImage} alt="Profile" className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover" />
                                ) : (
                                    <div className="w-20 h-20 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                                        <span className="text-emerald-600 font-bold text-xl">{getInitials(formData.restaurantName)}</span>
                                    </div>
                                )}
                                {isEditing && (
                                    <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
                                        {isUploading ? (
                                            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        )}
                                    </button>
                                )}
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            </div>
                            <div className="text-white text-center sm:text-left space-y-1">
                                <h2 className="text-xl sm:text-2xl font-bold">{formData.restaurantName}</h2>
                                <p className="text-emerald-100 text-base">{formData.firstName} {formData.lastName}</p>
                                <p className="text-emerald-100 text-sm break-all">{formData.email}</p>
                            </div>
                        </div>
                        <div className="flex-shrink-0">
                            {!isEditing ? (
                                <button onClick={handleEdit} className="bg-white text-emerald-600 px-4 py-2 rounded-lg font-medium hover:bg-emerald-50 transition-colors flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    Edit
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button onClick={handleCancel} className="bg-white/10 text-white px-4 py-2 rounded-lg font-medium hover:bg-white/20 transition-colors">Cancel</button>
                                    <button onClick={handleSave} disabled={isSaving} className="bg-white text-emerald-600 px-4 py-2 rounded-lg font-medium hover:bg-emerald-50 transition-colors flex items-center gap-2 disabled:opacity-50">
                                        {isSaving ? (
                                            <><div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>Saving...</>
                                        ) : (
                                            <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Save</>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-6">
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">Restaurant Details</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Restaurant Name *</label>
                            {isEditing ? (
                                <input type="text" value={formData.restaurantName} onChange={(e) => handleInputChange('restaurantName', e.target.value)} className="block text-sm w-full px-4 py-2.5 mt-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-0" />
                            ) : (
                                <p className="text-gray-900 dark:text-gray-100 py-2">{formData.restaurantName}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cuisine Type</label>
                            {isEditing ? (
                                <input type="text" value={formData.cuisineType} onChange={(e) => handleInputChange('cuisineType', e.target.value)} className="block text-sm w-full px-4 py-2.5 mt-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-0" />
                            ) : (
                                <p className="text-gray-900 dark:text-gray-100 py-2">{formData.cuisineType || 'Not set'}</p>
                            )}
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">Owner's Information</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">First Name *</label>
                                {isEditing ? <input type="text" value={formData.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)} className="block text-sm w-full px-4 py-2.5 mt-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-0" /> : <p className="text-gray-900 dark:text-gray-100 py-2">{formData.firstName}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Last Name *</label>
                                {isEditing ? <input type="text" value={formData.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)} className="block text-sm w-full px-4 py-2.5 mt-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-0" /> : <p className="text-gray-900 dark:text-gray-100 py-2">{formData.lastName}</p>}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contact Phone *</label>
                            {isEditing ? <input type="tel" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} className="block text-sm w-full px-4 py-2.5 mt-2 text-gray-700 placeholder-gray-400 bg-white border border-gray-200 rounded-lg dark:placeholder-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-0" /> : <p className="text-gray-900 dark:text-gray-100 py-2">{formData.phone}</p>}
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                            <div className="flex items-center gap-2">
                                <p className="text-gray-500 dark:text-gray-400 py-2 flex-1 break-all">{formData.email}</p>
                                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded whitespace-nowrap">Read-only</span>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
                            <div className="flex items-center gap-2">
                                <p className="text-gray-500 dark:text-gray-400 py-2 flex-1">{formData.role}</p>
                                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded whitespace-nowrap">Read-only</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RestaurantDetails;