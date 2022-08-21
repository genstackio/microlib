import ResourceNotFoundError from '@ohoareau/errors/lib/ResourceNotFoundError';

export default async () => {
    throw new ResourceNotFoundError();
}