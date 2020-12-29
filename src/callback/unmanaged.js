import { $isNothing } from "../core/base2";
import { Metadata } from "../core/metadata";

const unmanagedMetadataKey = Symbol("unmanaged-metadata")

const unmanagedMetadata = Metadata.decorator(unmanagedMetadataKey,
    (target, key, descriptor, args) => {
        if (!$isNothing(descriptor)) {
            throw new SyntaxError("@unmanaged can only be applied to classes.");
        }
        unmanagedMetadata.getOrCreateOwn(target, () => true);
    });

export const unmanaged = unmanagedMetadata();

unmanaged.isDefined = type => unmanagedMetadata.getOwn(type) === true;
