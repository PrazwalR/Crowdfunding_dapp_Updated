import { useState } from 'react';
import { uploadFileToIPFS } from '../utils/ipfs-utils';

export default function ImageUploader({ onImageUploaded }) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload to IPFS
    setIsUploading(true);
    try {
      const result = await uploadFileToIPFS(file);
      if (result.success) {
        onImageUploaded(result.hash);
      } else {
        console.error('Failed to upload image:', result.error);
        alert('Failed to upload image. Please try again.');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('An error occurred while uploading the image.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Campaign Image
      </label>
      <div className="mt-1 flex items-center">
        <label
          htmlFor="file-upload"
          className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {isUploading ? 'Uploading...' : 'Choose Image'}
        </label>
        <input
          id="file-upload"
          name="file-upload"
          type="file"
          className="sr-only"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        {previewUrl && (
          <div className="ml-4">
            <img
              src={previewUrl}
              alt="Preview"
              className="h-16 w-16 object-cover rounded-md"
            />
          </div>
        )}
      </div>
    </div>
  );
}
