import { StorageSharedKeyCredential, BlobSASPermissions, BlobServiceClient } from '@azure/storage-blob';
import { env } from '$env/dynamic/private';

const azureGenerateSasUrl = async (blobNames: string[]) => {
	try {
		const accountKey = env.AZURE_ACCOUNT_KEY;
		if (!accountKey) throw 'Missing env var AZURE_ACCOUNT_KEY';

		const account = 'vonagefiles';
		const containerName = 'callrecording';

		const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
		const blobServiceClient = new BlobServiceClient(`https://${account}.blob.core.windows.net`, sharedKeyCredential);

		const sasUrls: string[] = [];
		for (const blobName of blobNames)
			sasUrls.push(
				await blobServiceClient
					.getContainerClient(containerName)
					.getBlobClient(blobName)
					.generateSasUrl({
						permissions: BlobSASPermissions.parse('racwd'),
						expiresOn: new Date(new Date().valueOf() + 86400)
					})
			);
		return sasUrls;
	} catch (error) {
		return [];
	}
};

export default azureGenerateSasUrl;
