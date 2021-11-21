import ResourceNotFoundError from '../errors/ResourceNotFoundError';

export default async () => {
    throw new ResourceNotFoundError();
}