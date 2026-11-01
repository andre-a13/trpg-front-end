import type { IAddCharacter, IUpdateCharacter } from "../interface/IAddCharacter";
import Character from "../models/character";
import { charactersCreate, charactersGet, charactersList, charactersUpdate,
    charactersCreatePortraitUpload, charactersCreateBackgroundUpload } from "../api/generated/sdk.gen";
import type { CharacterPortraitUploadRequest } from "../api/generated/types.gen";
import { apiOptions } from "./api";

async function create( body : IAddCharacter )
{
    const res = await charactersCreate({ ...apiOptions, body });
    return res;
}

async function getBySlug( slug : string )
{
    const res = await charactersGet({ ...apiOptions, path: { slug } });
    return new Character(res.data);
}

async function list()
{
    const res = await charactersList(apiOptions);
    return res.data.map((item) => new Character(item));
}

async function patch( slug : string, body : IUpdateCharacter )
{
    const res = await charactersUpdate({ ...apiOptions, path: { slug }, body });
    return res;
}

async function uploadPortrait( slug : string, file : File )
{
    const uploadRequest = await charactersCreatePortraitUpload({
        ...apiOptions, path: { slug }, body: {
            filename: file.name,
            content_type: file.type as CharacterPortraitUploadRequest["content_type"],
            size: file.size,
        },
    });

    const uploadResponse = await fetch(uploadRequest.data.upload_url, {
        method: "PUT",
        headers: {
            "Content-Type": file.type,
        },
        body: file,
    });

    if (!uploadResponse.ok) {
        throw new Error("Portrait upload failed");
    }

    await patch(slug, { portraitUrl: uploadRequest.data.public_url });

    return uploadRequest.data.public_url;
}

async function uploadBackground( slug : string, file : File )
{
    const uploadRequest = await charactersCreateBackgroundUpload({
        ...apiOptions, path: { slug }, body: {
            filename: file.name,
            content_type: file.type as CharacterPortraitUploadRequest["content_type"],
            size: file.size,
        },
    });

    const uploadResponse = await fetch(uploadRequest.data.upload_url, {
        method: "PUT",
        headers: {
            "Content-Type": file.type,
        },
        body: file,
    });

    if (!uploadResponse.ok) {
        throw new Error("Background upload failed");
    }

    await patch(slug, { backgroundUrl: uploadRequest.data.public_url });

    return uploadRequest.data.public_url;
}

export default {
    create,
    getBySlug,
    list,
    patch,
    uploadPortrait,
    uploadBackground
}
